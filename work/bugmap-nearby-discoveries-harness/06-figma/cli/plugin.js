const bugMapNearbyCommand = (() => {
  const plan = NEARBY_PLAN;
  const tag = 'bugmapNearby08';
  const { target, layout } = plan;
  const source = target.prototypeSource;
  const cardKeys = ['stag-beetle', 'dragonfly', 'ladybird'];
  const tabs = ['map', 'community', 'chat', 'my'];
  const box = (x, y, width, height) => ({ x, y, width, height });
  const info = node => ({ id:node.id, name:node.name, type:node.type, x:node.x, y:node.y, width:node.width, height:node.height });
  const position = (node, x, y) => { node.x = x; node.y = y; return node; };
  const attach = (parent, node, x, y) => {
    parent.appendChild(node);
    if (parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE';
    return position(node, x, y);
  };
  const mark = (node, component, id, interactive = false) => {
    if (component) node.setPluginData(tag + ':component', component);
    if (id) node.setPluginData(tag + ':semantic', id);
    if (interactive) node.setPluginData(tag + ':interactive', 'true');
    return node;
  };
  const bounds = (node, width, height) => {
    node.layoutMode = 'VERTICAL';
    node.primaryAxisSizingMode = 'FIXED';
    node.counterAxisSizingMode = 'FIXED';
    node.resize(width, height);
  };
  const frame = (parent, name, rect, makeComponent = false) => {
    const node = makeComponent ? figma.createComponent() : figma.createFrame();
    node.name = name;
    bounds(node, rect.width, rect.height);
    node.fills = [];
    node.clipsContent = false;
    return parent ? attach(parent, node, rect.x, rect.y) : position(node, rect.x, rect.y);
  };
  function rgba(hex) {
    const [r,g,b] = hex.slice(1).match(/../g).map(value => parseInt(value, 16)/255);
    return {r,g,b};
  }
  function equivalentRGB(a,b) {
    return ['r','g','b'].every(key => Math.abs(a[key] - b[key]) < 0.00001);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function exportTree(node, includeBindings = true) {
    const out = { ...info(node), opacity:node.opacity, rotation:node.rotation, visible:node.visible,
      fills:Array.isArray(node.fills) ? clone(node.fills) : [] };
    for (const key of ['layoutMode','layoutPositioning','cornerRadius','topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius',
      'strokeWeight','strokeAlign','clipsContent','overflowDirection','strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight','isMask',
      'primaryAxisSizingMode','counterAxisSizingMode','layoutSizingHorizontal','layoutSizingVertical','itemSpacing']) {
      if (['number','boolean','string'].includes(typeof node[key])) out[key] = node[key];
    }
    for (const key of ['strokes','effects','reactions','vectorPaths']) if (Array.isArray(node[key])) out[key] = clone(node[key]);
    if (node.type === 'TEXT') {
      out.characters = node.characters;
      if (typeof node.fontSize === 'number') out.fontSize = node.fontSize;
      if (typeof node.fontName === 'object') out.fontName = clone(node.fontName);
      if (typeof node.lineHeight === 'object') out.lineHeight = clone(node.lineHeight);
    }
    if (includeBindings) {
      const componentName = node.getPluginData(tag+':component') || node.getPluginData('bugmapMainMap07:component');
      const key = node.getPluginData(tag+':semantic');
      const asset = node.getPluginData(tag+':asset') || (node.name.startsWith('사진 · ') ? plan.assets[node.name.split(' · ')[1]]?.path : undefined);
      if (componentName) out.componentName = componentName;
      if (key) out.semanticId = key;
      if (asset) out.assetPath = asset;
      if (node.getPluginData(tag+':interactive') === 'true' || node.getPluginData('bugmapMainMap07:interactive') === 'true') out.interactive = true;
      if (node.boundVariables && Object.keys(node.boundVariables).length) out.boundVariables = clone(node.boundVariables);
    }
    if ('children' in node) out.children = node.children.map(child => exportTree(child, includeBindings));
    return out;
  }
  function storedAnchorLayout() {
    return ['7:2', '19:2', source.nodeId];
  }
  async function context(params, permitFrames = false) {
    const page = figma.currentPage;
    const fileKey = figma.fileKey ?? null;
    if (params?.fileKey !== target.fileKey || params?.planDigest !== plan.digest ||
        (fileKey && fileKey !== target.fileKey) || figma.root.name !== target.documentName ||
        page.id !== target.pageId || page.name !== target.pageName) throw new Error('Approved Figma file, page or plan mismatch');
    await page.loadAsync();
    const main = await figma.getNodeByIdAsync(source.nodeId);
    const handle = await figma.getNodeByIdAsync(source.dragHandleId);
    if (main?.name !== source.name || main?.type !== 'FRAME' || main.parent?.id !== page.id || main.width !== 390 || main.height !== 844 ||
        handle?.width !== 390 || handle?.height !== 44 || !Array.isArray(handle.reactions) || typeof handle.setReactionsAsync !== 'function') {
      throw new Error('Approved map and draggable handle do not match current Figma nodes');
    }
    let owner = handle.parent;
    while (owner && owner.id !== main.id) owner = owner.parent;
    if (!owner || storedAnchorLayout().some(id => !page.children.some(node => node.id === id))) throw new Error('Existing screen identity differs');
    const active = page.children.filter(node => node.getPluginData(tag+':plan') === plan.digest);
    const roots = active.filter(node => node.type === 'FRAME');
    const stateNames = plan.states.map(state => state.name);
    if (page.children.some(node => stateNames.includes(node.name) && !roots.includes(node)) ||
        (!permitFrames && active.length > 0)) throw new Error('Nearby edit collision; inspect current frames before retry');
    return { page, main, handle, roots, active, fileKey };
  }
  async function selectFonts() {
    const available = (await figma.listAvailableFontsAsync()).map(item => item.fontName);
    for (const family of ['Pretendard','Noto Sans KR','Apple SD Gothic Neo']) {
      const medium = available.find(item => item.family === family && item.style === 'Medium');
      const bold = available.find(item => item.family === family && item.style === 'Bold');
      if (!medium || !bold) continue;
      try {
        await Promise.all([figma.loadFontAsync(medium), figma.loadFontAsync(bold)]);
        return {500:medium,700:bold};
      } catch (err) {
        console.warn(family + ' could not be loaded');
      }
    }
    throw new Error('No approved or existing-map-compatible Korean font pair is available');
  }
  function vector(parent, name, artwork, dimensions) {
    const imported = figma.createNodeFromSvg(artwork);
    const wrapper = frame(parent, name, dimensions);
    try {
      if (!imported.children.length) throw new Error('SVG imported no layers');
      const group = figma.group([...imported.children],imported);
      attach(wrapper,group,group.x,group.y);
      group.name = name + ' · 벡터';
    } finally { imported.remove(); }
    return wrapper;
  }
  function asBase64(bytes) {
    if (typeof figma.base64Encode === 'function') return figma.base64Encode(bytes);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let ii = 0; ii < bytes.length; ii += 3) {
      const a = bytes[ii], b = bytes[ii+1] ?? 0, c = bytes[ii+2] ?? 0;
      result += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] +
        (ii+1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
        (ii+2 < bytes.length ? alphabet[c & 63] : '=');
    }
    return result;
  }
  function png(node) {
    return node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}}).then(asBase64);
  }
  function startPoints(page) {
    return Array.isArray(page.flowStartingPoints) ? clone(page.flowStartingPoints) : null;
  }
  async function preservation(ctx) {
    const anchors = [];
    for (const id of storedAnchorLayout()) {
      const node = await figma.getNodeByIdAsync(id);
      anchors.push({id, tree:exportTree(node,false), png:await png(node)});
    }
    return {roots:ctx.page.children.filter(node => node.getPluginData(tag+':plan') !== plan.digest).map(info),
      startPoints:startPoints(ctx.page), handleReactions:clone(ctx.handle.reactions), anchors};
  }
  async function inspect(ctx) {
    const variables = (await figma.variables.getLocalVariablesAsync('COLOR')).map(({id,name,variableCollectionId}) => ({id,name,variableCollectionId}));
    return { fileKey:ctx.fileKey, documentName:figma.root.name, pageId:ctx.page.id, pageName:ctx.page.name,
      roots:ctx.page.children.map(info), handle:{...info(ctx.handle),reactions:clone(ctx.handle.reactions)},
      flowStartingPoints:startPoints(ctx.page), variables, planDigest:plan.digest,
      authored:ctx.active.map(info) };
  }
  function navigation(destinationId, kind) {
    return {type:'NODE', destinationId, navigation:'NAVIGATE',
      transition:kind === 'drag' ? {type:'MOVE_IN',direction:'TOP',matchLayers:false, duration:0.28,easing:{type:'EASE_OUT'}} : null};
  }
  function reaction(destinationId, kind = 'click') {
    return {trigger:{type:kind === 'drag' ? 'ON_DRAG' : 'ON_CLICK'}, actions:[navigation(destinationId,kind)]};
  }
  async function build(ctx) {
    const previousReactions = clone(ctx.handle.reactions);
    if (previousReactions.some(item => item.trigger?.type === 'ON_DRAG')) throw new Error('Existing handle already has a drag route; no mutation performed');
    const before = await preservation(ctx);
    const fonts = await selectFonts();
    const preexisting = new Set(ctx.page.children.map(node => node.id));
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    const mainCollection = existingCollections.find(item => item.name === 'BugMap · 발견 지도 07');
    const existingColors = await figma.variables.getLocalVariablesAsync('COLOR');
    const ownVariables = {};
    let newCollection;
    const paint = key => {
      const value = plan.colors[key] ?? key;
      if (!/^#[A-Fa-f0-9]{6}$/.test(value)) throw new Error('Unsupported token ' + key);
      const token = Object.hasOwn(plan.colors,key) ? key : Object.keys(plan.colors).find(id => plan.colors[id].toLowerCase() === value.toLowerCase());
      if (!token) throw new Error('Unapproved color: ' + value);
      const color = rgba(value);
      let variable = ownVariables[token];
      if (!variable) {
        variable = existingColors.find(v => v.name === token && (!mainCollection || v.variableCollectionId === mainCollection.id) &&
          Object.values(v.valuesByMode).every(mode => equivalentRGB(mode,color) && (mode.a ?? 1) === 1));
        if (!variable) {
          newCollection = newCollection ?? figma.variables.createVariableCollection('BugMap · 내 주변 발견');
          variable = figma.variables.createVariable(token,newCollection,'COLOR');
          variable.setValueForMode(newCollection.defaultModeId,{...color,a:1});
        }
        ownVariables[token] = variable;
      }
      return figma.variables.setBoundVariableForPaint({type:'SOLID',color,opacity:1}, 'color', variable);
    };
    const rect = (parent, name, dimensions, token, radius, border) => {
      const node = figma.createRectangle();
      node.name = name;
      node.resize(dimensions.width,dimensions.height);
      node.cornerRadius = radius ?? 0;
      if (token) node.fills = [paint(token)];
      else node.fills = [];
      if (border) {
        node.strokes = [paint(border)];
        node.strokeAlign = 'INSIDE';
        node.strokeWeight = 1;
      }
      return attach(parent,node,dimensions.x,dimensions.y);
    };
    const label = (parent,state,id,originX = 0,originY = 0) => {
      const spec = state.texts[id];
      if (!spec) throw new Error('Missing approved label ' + id);
      const type = Object.values(plan.typography).find(type => type.fontSize === spec.fontSize && type.fontWeight === spec.fontWeight);
      if (!type) throw new Error('Missing typography for ' + id);
      const text = figma.createText();
      text.name = spec.text;
      text.fontName = fonts[spec.fontWeight];
      text.fontSize = spec.fontSize;
      text.lineHeight = {unit:'PIXELS',value:type.lineHeight};
      text.characters = spec.text;
      text.fills = [paint(spec.color)];
      text.textAutoResize = 'WIDTH_AND_HEIGHT';
      const offset = spec.anchor === 'middle' ? text.width/2 : spec.anchor === 'end' ? text.width : 0;
      return attach(parent,text,spec.anchorX-originX-offset,spec.centerY-originY-text.height/2);
    };
    const icon = (parent,state,id,originX = 0,originY = 0) => {
      const {svg,box:rect} = state.icons[id];
      return vector(parent,'Lucide · ' + id,svg,box(rect.x-originX,rect.y-originY,rect.width,rect.height));
    };
    const targetBox = (state,id) => {
      const control = state.targets[id];
      if (!control || control.box.width < 44 || control.box.height < 44) throw new Error('Missing approved touch target: ' + id);
      return control.box;
    };
    const control = (parent,state,id,component,originX = 0,originY = 0) => {
      const rect = targetBox(state,id);
      return mark(frame(parent,state.targets[id].label,box(rect.x-originX,rect.y-originY,rect.width,rect.height)),component,id,true);
    };
    const reference = plan.states.find(state => state.state === 'default');
    const mainEnd = Math.max(ctx.main.x+ctx.main.width, ...ctx.page.children.filter(node => node.type === 'FRAME' &&
      node.y < ctx.main.y+ctx.main.height && node.y+node.height > ctx.main.y).map(node => node.x+node.width));
    const startX = mainEnd + 96;
    const componentX = startX + 2 * (390+96);
    const photoImages = {};
    const componentRoots = {};
    let handleWritten = false;

    function fixedComponent(name, componentKey, coordinates, describe) {
      const node = mark(frame(null,name,coordinates,true),componentKey);
      node.setPluginData(tag+':plan',plan.digest);
      node.description = describe;
      return node;
    }
    function cardMaster(id,index) {
      const control = targetBox(reference,'record-'+id);
      const photo = reference.photos['photo-'+id];
      const master = fixedComponent('RecordCard · '+reference.texts['name-'+id].text,'RecordCard',
        box(componentX,ctx.main.y + index*140,control.width,control.height),'곤충명, 관찰·채집, 공개 지역, 발견 일시와 공개 거리.');
      rect(master,'기록 카드 배경',box(0,0,control.width,control.height),'recordSurface',layout.list.cardRadius,'recordBorder');
      const attribution = plan.assets[id];
      const photoLayer = rect(master,'사진 · '+id+' · '+attribution.artist,box(photo.x-control.x,photo.y-control.y,photo.width,photo.height),null,layout.list.photoRadius);
      photoLayer.fills = [{type:'IMAGE',imageHash:photoImages[id].hash,scaleMode:'FIT'}];
      photoLayer.setPluginData(tag+':asset',attribution.path);
      photoLayer.setPluginData(tag+':credit',JSON.stringify(attribution));
      master.description += '\nPhoto: ' + attribution.artist + ' · ' + attribution.license + ' · ' + attribution.url + '\n' + attribution.modifications;
      if (attribution.licenseUrl) master.description += '\n' + attribution.licenseUrl;
      const typeText = reference.texts['type-'+id];
      rect(master,'기록 유형 배지',box(typeText.anchorX-control.x-18.5,typeText.centerY-control.y-10,37,20),
        typeText.key === 'collected' ? 'activeTabSurface' : 'searchSurface',5);
      for (const field of ['name','distance','type','place','date']) label(master,reference,field+'-'+id,control.x,control.y);
      return master;
    }
    function tabsMaster() {
      const master = fixedComponent('MapTab · 메인 내비게이션','MapTab',box(componentX,ctx.main.y+432,390,52),
        '메인 발견 지도와 같은 지도·커뮤니티·채팅·마이 순서.');
      for (const id of tabs) {
        const key = 'tab-'+id, dimensions = targetBox(reference,key);
        const node = control(master,reference,key,'MapTab',0,layout.tab.y);
        if (reference.targets[key].selected === 'true') rect(node,'현재 선택',box(0,0,dimensions.width,dimensions.height),'activeTabSurface',layout.tab.radius,'activeTabBorder');
        icon(node,reference,'tab-icon-'+id,dimensions.x,dimensions.y);
        label(node,reference,'tab-label-'+id,dimensions.x,dimensions.y);
      }
      return master;
    }
    function searchMaster() {
      const dimensions = targetBox(reference,'search');
      const master = fixedComponent('Search · 곤충·지역','Search',box(componentX,ctx.main.y+512,dimensions.width,dimensions.height),
        '메인 지도와 같은 곤충 이름 또는 지역 검색.');
      rect(master,'검색창 배경',box(0,0,dimensions.width,dimensions.height),'searchSurface',layout.search.radius,'searchBorder');
      icon(master,reference,'search-icon',dimensions.x,dimensions.y);
      label(master,reference,'search-label',dimensions.x,dimensions.y);
      return master;
    }
    function returnMaster() {
      const dimensions = targetBox(reference,'map-return');
      const master = fixedComponent('MapReturn · 지도 보기','MapReturn',box(componentX,ctx.main.y+584,dimensions.width,dimensions.height),
        '내 주변 발견의 각 대표 상태에서 메인 지도로 복귀.');
      rect(master,'지도 보기 배경',box(0,0,dimensions.width,dimensions.height),'primary',layout.mapReturn.radius);
      icon(master,reference,'map-return-icon',dimensions.x,dimensions.y);
      label(master,reference,'map-return-label',dimensions.x,dimensions.y);
      return master;
    }
    function makeState(state,index) {
      const root = mark(frame(null,state.name,box(startX + index*(390+96),ctx.main.y,390,844)),'NearbySheet',state.state);
      root.setPluginData(tag+':plan',plan.digest);
      root.fills = [paint('background')];
      root.clipsContent = true;
      const {y:sheetY,width:sheetWidth,height:sheetHeight,topRadius} = layout.sheet;
      const outline = rect(root,'내 주변 발견 · 패널 바탕',box(0,sheetY,sheetWidth,sheetHeight),'mapPanel',0,'mapPanelBorder');
      outline.topLeftRadius = topRadius;
      outline.topRightRadius = topRadius;
      label(root,state,'time');
      vector(root,'상태 표시 · 벡터',state.statusSvg,box(304,20,68,14));
      const grab = control(root,state,'sheet-handle','NearbySheet');
      rect(grab,'드래그 손잡이',box(layout.handle.x,layout.handle.y-sheetY,layout.handle.width,layout.handle.height),'sheetHandle',2);
      const searchBox = targetBox(state,'search');
      const search = attach(root,componentRoots.search.createInstance(),searchBox.x,searchBox.y);
      search.name = state.targets.search.label;
      mark(search,'Search','search',true);
      const chips = {};
      for (const id of ['all','1km','3km','5km']) {
        const key = 'radius-'+id;
        const dimensions = targetBox(state,key);
        const node = control(root,state,key,'RadiusChip');
        chips[id] = node;
        const active = state.targets[key].pressed === 'true';
        rect(node,'거리 칩 배경',box(0,0,dimensions.width,dimensions.height),
          active?'activeTabSurface':'observationMarkerSurface',layout.filter.radius,active?'primary':'observationMarkerBorder');
        label(node,state,'radius-label-'+id,dimensions.x,dimensions.y);
      }
      label(root,state,'list-title');
      label(root,state,'record-count');
      const list = mark(frame(root,'기록 목록 · 세로 스크롤',layout.list),'RecordList');
      list.clipsContent = true;
      try { list.overflowDirection = 'VERTICAL'; }
      catch (error) { list.overflowDirection = 'VERTICAL_SCROLLING'; }
      for (const id of cardKeys) {
        const record = state.targets['record-'+id];
        if (!record) continue;
        const instance = componentRoots[id].createInstance();
        instance.name = record.label;
        mark(instance,'RecordCard','record-'+id,true);
        attach(list,instance,record.box.x-layout.list.x,record.box.y-layout.list.y);
      }
      const footer = frame(root,'지도 복귀 및 하단 탭 · 고정',layout.footer);
      footer.fills = [paint('footerSurface')];
      rect(footer,'고정 영역 구분선',box(0,0,layout.footer.width,1),'mapPanelBorder',0);
      const mapBox = targetBox(state,'map-return');
      const returnInstance = attach(footer,componentRoots.mapReturn.createInstance(),mapBox.x,mapBox.y-layout.footer.y);
      returnInstance.name = state.targets['map-return'].label;
      mark(returnInstance,'MapReturn','map-return',true);
      attach(footer,componentRoots.tabs.createInstance(),0,layout.tab.y-layout.footer.y);
      rect(footer,'홈 인디케이터',box(layout.home.x,layout.home.y-layout.footer.y,layout.home.width,layout.home.height),'systemHome',2);
      return {root,chips,returnInstance};
    }
    try {
      for (const id of cardKeys) {
        const bytes = figma.base64Decode(NEARBY_ASSET_BYTES[id]);
        photoImages[id] = figma.createImage(bytes);
      }
      for (const [index,id] of cardKeys.entries()) componentRoots[id] = cardMaster(id,index);
      componentRoots.tabs = tabsMaster();
      componentRoots.search = searchMaster();
      componentRoots.mapReturn = returnMaster();
      const [all,distance] = plan.states.map(makeState);
      await all.chips['3km'].setReactionsAsync([reaction(distance.root.id)]);
      await distance.chips.all.setReactionsAsync([reaction(all.root.id)]);
      await all.returnInstance.setReactionsAsync([reaction(ctx.main.id)]);
      await distance.returnInstance.setReactionsAsync([reaction(ctx.main.id)]);
      await ctx.handle.setReactionsAsync([...previousReactions,reaction(all.root.id,'drag')]);
      handleWritten = true;
      const newCtx = await context({fileKey:target.fileKey,planDigest:plan.digest},true);
      const after = await preservation(newCtx);
      const result = await exportNearby(newCtx);
      return { ...result,preservation:{before,after},fonts,variables:Object.entries(ownVariables).map(([name,v])=>({name,id:v.id,variableCollectionId:v.variableCollectionId})) };
    } catch (error) {
      if (handleWritten) await ctx.handle.setReactionsAsync(previousReactions);
      for (const node of [...ctx.page.children].reverse()) if (!preexisting.has(node.id)) node.remove();
      if (newCollection) newCollection.remove();
      throw error;
    }
  }
  async function exportNearby(ctx) {
    if (ctx.roots.length !== 2) throw new Error('Expected two authored representative states');
    const screens = [];
    for (const state of plan.states) {
      const node = ctx.roots.find(node => node.getPluginData(tag+':semantic') === state.state);
      if (node?.name !== state.name) throw new Error('Missing authored state ' + state.state);
      screens.push({state:state.state, tree:exportTree(node), pngBase64:await png(node)});
    }
    const imported = ctx.active.filter(node => node.type === 'COMPONENT').flatMap(root =>
      root.children.filter(node => node.getPluginData(tag+':asset')).map(node =>
        ({nodeId:node.id,path:node.getPluginData(tag+':asset'), hash:node.fills[0].imageHash})));
    return {...await inspect(ctx),screens,imported};
  }
  return async (mode, params) => {
    const ctx = await context(params,mode !== 'build');
    if (mode === 'status') return inspect(ctx);
    if (mode === 'build') return build(ctx);
    if (mode === 'export') return exportNearby(ctx);
    if (mode === 'baseline') return preservation(ctx);
    throw new Error('Unsupported nearby builder command');
  };
})();
