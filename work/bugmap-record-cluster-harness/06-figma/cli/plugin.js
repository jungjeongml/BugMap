const bugMapClusterCommand = (() => {
  const plan = CLUSTER_PLAN;
  const { target, layout } = plan;
  const source = target.prototypeSource;
  const tag = 'bugmapCluster07';
  const key = part => tag + ':' + part;
  const clone = item => JSON.parse(JSON.stringify(item));
  const info = node => ({id:node.id,name:node.name,type:node.type,x:node.x,y:node.y,width:node.width,height:node.height});
  const recordGeometry = (x,y,width,height) => ({x,y,width,height});
  function mark(node, semantic, component, interactive = false) {
    if (semantic) node.setPluginData(key('semantic'),semantic);
    if (component) node.setPluginData(key('component'),component);
    if (interactive) node.setPluginData(key('interactive'),'true');
    return node;
  }
  function exportTree(node, includeTags = true) {
    const out = {...info(node),opacity:node.opacity,rotation:node.rotation,visible:node.visible,
      fills:Array.isArray(node.fills) ? clone(node.fills) : []};
    const properties = ['layoutMode','layoutPositioning','cornerRadius','topLeftRadius','topRightRadius','bottomLeftRadius',
      'bottomRightRadius','strokeWeight','strokeAlign','clipsContent','overflowDirection','scrollBehavior',
      'strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight','isMask','primaryAxisSizingMode',
      'counterAxisSizingMode','layoutSizingHorizontal','layoutSizingVertical','itemSpacing','paddingLeft','paddingRight',
      'paddingTop','paddingBottom','primaryAxisAlignItems','counterAxisAlignItems','textAutoResize','textAlignVertical'];
    for (const prop of properties) if (['number','boolean','string'].includes(typeof node[prop])) out[prop] = node[prop];
    for (const prop of ['strokes','effects','reactions','vectorPaths']) if (Array.isArray(node[prop])) out[prop] = clone(node[prop]);
    if (node.type === 'TEXT') {
      out.characters = node.characters;
      if (typeof node.fontSize === 'number') out.fontSize = node.fontSize;
      if (typeof node.fontName === 'object') out.fontName = clone(node.fontName);
      if (typeof node.lineHeight === 'object') out.lineHeight = clone(node.lineHeight);
    }
    if (includeTags) {
      for (const [part,prop] of [['semantic','semanticId'],['component','componentName'],['recordId','recordId'],
        ['detailId','detailRecordId'],['coordinateGroup','publicCoordinateGroup'],['credit','photoCredit'],['selected','selected']]) {
        const value = node.getPluginData(key(part));
        if (value) out[prop] = value;
      }
      if (node.getPluginData(key('interactive')) === 'true') out.interactive = true;
      if (node.boundVariables && Object.keys(node.boundVariables).length) out.boundVariables = clone(node.boundVariables);
    }
    if ('children' in node) out.children = node.children.map(child => exportTree(child,includeTags));
    return out;
  }
  function startPoints(page) {
    return Array.isArray(page.flowStartingPoints) ? clone(page.flowStartingPoints) : [];
  }
  const png = async node => figma.base64Encode(await node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}}));
  function route(destinationId, resetScroll = false) {
    return {trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId,navigation:'NAVIGATE',transition:null,
      ...(resetScroll ? {resetScrollPosition:true} : {})}]};
  }

  async function context(params, allowAuthored) {
    const page = figma.currentPage;
    const fileKey = figma.fileKey ?? null;
    if (params?.fileKey !== target.fileKey || params?.planDigest !== plan.digest || (fileKey && fileKey !== target.fileKey)
        || figma.root.name !== target.documentName || page.id !== target.pageId || page.name !== target.pageName) {
      throw new Error('Approved Figma target or plan mismatch');
    }
    await page.loadAsync();
    const main = await figma.getNodeByIdAsync(source.nodeId);
    if (main?.name !== source.name || main.type !== 'FRAME' || main.parent?.id !== page.id || main.width !== 390 || main.height !== 844) {
      throw new Error('Original discovery map mismatch');
    }
    const nodeById = new Map(main.children.map(node => [node.id,node]));
    const markers = [source.clusterMarkerId,source.overflowClusterMarkerId].map(id=>nodeById.get(id));
    for (const [index,node] of markers.entries()) {
      if (node?.name !== ['기록 3개','기록 7개'][index] || node.type !== 'INSTANCE' || node.width !== 64 || node.height !== 44 ||
        !Array.isArray(node.reactions) || typeof node.setReactionsAsync !== 'function') throw new Error('Original marker mismatch: '+index);
    }
    const donorIds = [...plan.sourceLayerIds,...plan.systemLayerIds,plan.attributionId,plan.logoId];
    if (!donorIds.every(id=>nodeById.has(id)) || nodeById.get(plan.logoId).width !== 88 ||
      nodeById.get(plan.logoId).height !== 23 || nodeById.get(plan.attributionId).width !== 44 ||
      nodeById.get(plan.attributionId).height !== 44) throw new Error('Existing approved map donors mismatch');
    const authored = page.children.filter(node=>node.getPluginData(key('plan')) === plan.digest);
    const stateNames = plan.states.map(state=>state.frameName);
    const occupied = page.children.some(node=>!authored.includes(node) &&
      (stateNames.includes(node.name) || node.name === '기록 행 · 주변 관찰 기록'));
    if (occupied || (!allowAuthored && authored.length > 0)) throw new Error('Duplicate or colliding cluster edit; inspect original before retrying');
    return {page,fileKey,main,nodeById,markers,authored,roots:authored.filter(node=>node.type === 'FRAME')};
  }

  function status(ctx) {
    return {fileKey:ctx.fileKey,documentName:figma.root.name,pageId:ctx.page.id,pageName:ctx.page.name,planDigest:plan.digest,
      roots:ctx.page.children.map(info),authored:ctx.authored.map(info),main:info(ctx.main),
      markers:ctx.markers.map(node=>({...info(node),reactions:clone(node.reactions)})),
      attributionReactions:clone(ctx.nodeById.get(plan.attributionId).reactions),
      flowStartingPoints:startPoints(ctx.page)};
  }
  async function preservation(ctx) {
    const originals = ctx.page.children.filter(node=>!ctx.authored.includes(node));
    return {
      roots:originals.map(info), trees:originals.map(node=>exportTree(node,false)),
      markerReactions:ctx.markers.map(node=>({id:node.id,reactions:clone(node.reactions)})),
      flowStartingPoints:startPoints(ctx.page), mainPng:await png(ctx.main)
    };
  }
  async function selectFonts() {
    const fonts = (await figma.listAvailableFontsAsync()).map(item=>item.fontName);
    for (const family of ['Pretendard','Noto Sans KR']) {
      const medium = fonts.find(item=>item.family===family && item.style==='Medium');
      const bold = fonts.find(item=>item.family===family && item.style==='Bold');
      if (!medium || !bold) continue;
      try {
        await Promise.all([figma.loadFontAsync(medium),figma.loadFontAsync(bold)]);
        return {500:medium,700:bold};
      } catch (error) { console.warn('Korean font unavailable: '+family); }
    }
    throw new Error('Approved Korean font or its native fallback is unavailable');
  }
  const colorValue = hex => {
    if (!/^#[0-9a-f]{6}$/i.test(hex ?? '')) throw new Error('Unsupported token paint '+hex);
    const [r,g,b] = hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255);
    return {r,g,b};
  };

  async function build(ctx) {
    if (ctx.markers.some(node=>node.reactions.some(reaction=>reaction.trigger?.type==='ON_CLICK'))) {
      throw new Error('Competing click reaction on original marker; no mutation performed');
    }
    const before = await preservation(ctx);
    const fonts = await selectFonts();
    const availableColors = await figma.variables.getLocalVariablesAsync('COLOR');
    const mainCollection = (await figma.variables.getLocalVariableCollectionsAsync()).find(item=>item.name==='BugMap · 발견 지도 07');
    const createdNodes = [], touchedMarkers = [], colors = new Map(), photoImages = {};
    let collection, checkpoint = 'photo import';
    const track = node => { createdNodes.push(node); return node; };
    function paint(token) {
      const value = colorValue(plan.colors[token]);
      if (!colors.has(token)) {
        const candidate = availableColors.find(v=>v.name===token &&
          (!mainCollection || v.variableCollectionId === mainCollection.id) &&
          Object.values(v.valuesByMode).every(mode=>['r','g','b'].every(channel=>Math.abs(mode[channel]-value[channel])<0.00001) &&
            (mode.a ?? 1)===1));
        if (candidate) colors.set(token,candidate);
        else {
          collection ??= figma.variables.createVariableCollection('BugMap · 주변 관찰 기록');
          const variable = figma.variables.createVariable(token,collection,'COLOR');
          variable.setValueForMode(collection.defaultModeId,{...value,a:1});
          colors.set(token,variable);
        }
      }
      return figma.variables.setBoundVariableForPaint({type:'SOLID',color:value,opacity:1},'color',colors.get(token));
    }
    function position(node,x,y) { node.x=x; node.y=y; return node; }
    function attach(parent,node,x,y) {
      parent.appendChild(node);
      if (parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE';
      return position(node,x,y);
    }
    function frame(parent,name,box,{direction='VERTICAL',flow=false,component=false}={}) {
      const node = track(component ? figma.createComponent() : figma.createFrame());
      node.name = name;
      node.layoutMode = direction;
      node.primaryAxisSizingMode = 'FIXED';
      node.counterAxisSizingMode = 'FIXED';
      node.resize(box.width,box.height);
      node.fills = [];
      node.clipsContent = false;
      if (!parent) return position(node,box.x,box.y);
      if (flow) {
        parent.appendChild(node);
        node.layoutSizingHorizontal = 'FIXED';
        node.layoutSizingVertical = 'FIXED';
        return node;
      }
      return attach(parent,node,box.x,box.y);
    }
    function shape(parent,name,box,token,{radius=0,border,borderWidth=1,ellipse=false}={}) {
      const node = track(ellipse ? figma.createEllipse() : figma.createRectangle());
      node.name = name;
      node.resize(box.width,box.height);
      if (!ellipse) node.cornerRadius = radius;
      node.fills = token ? [paint(token)] : [];
      node.strokes = border ? [paint(border)] : [];
      if (border) {
        node.strokeAlign = 'INSIDE';
        node.strokeWeight = borderWidth;
      }
      return attach(parent,node,box.x,box.y);
    }
    function vector(parent,name,asset,size,x,y,flow=false) {
      const imported = track(figma.createNodeFromSvg(plan.icons[asset]));
      try {
        if (!imported.children.length) throw new Error('Missing Lucide SVG layers: '+asset);
        const group = track(figma.group([...imported.children],imported));
        group.name = name;
        const holder = frame(parent,name,recordGeometry(x,y,size,size),{flow});
        attach(holder,group,group.x,group.y);
        return holder;
      } finally { imported.remove(); }
    }
    function text(parent,name,value,style,box,token,flow=false) {
      const spec = plan.typography[style];
      const node = track(figma.createText());
      node.name = name;
      node.fontName = fonts[spec.fontWeight];
      node.fontSize = spec.fontSize;
      node.lineHeight = {unit:'PIXELS',value:spec.lineHeight};
      node.characters = value;
      node.fills = [paint(token)];
      node.textAutoResize = 'HEIGHT';
      node.resize(box.width,spec.lineHeight);
      if (flow) {
        parent.appendChild(node);
        node.layoutSizingHorizontal = 'FILL';
        return node;
      }
      return attach(parent,node,box.x,box.y);
    }
    function borrow(parent,id,label,point) {
      const original = ctx.nodeById.get(id);
      const dup = track(original.clone());
      if (label) dup.name = label;
      return attach(parent,dup,point?.x ?? original.x,point?.y ?? original.y);
    }
    function rowMaster(x,y) {
      const row = layout.row;
      const width = plan.states[0].layout.listViewport.width;
      const master = mark(frame(null,'기록 행 · 주변 관찰 기록',recordGeometry(x,y,width,row.minimumHeight),
        {direction:'HORIZONTAL',component:true}),'row-master','recordRow');
      master.setPluginData(key('plan'),plan.digest);
      master.description = '반복 관찰 기록 행. 사진, 곤충 이름, 실제 발견 날짜, 기록별 상세 이동 표시. 사진 출처와 recordId는 각 인스턴스 플러그인 데이터에 기록.';
      master.fills = [paint('recordRow')];
      master.paddingLeft = row.inset;
      master.paddingRight = 14;
      master.paddingTop = row.inset;
      master.paddingBottom = row.inset;
      master.itemSpacing = row.textGap;
      master.cornerRadius = row.radius;
      master.counterAxisAlignItems = 'CENTER';
      const photo = frame(master,'사진 · 80 × 80 크롭',recordGeometry(0,0,row.photoSize,row.photoSize),{flow:true});
      photo.cornerRadius = row.photoRadius;
      photo.clipsContent = true;
      const specimen = plan.assets['specimen-1'].dimensions;
      const wideWidth = row.photoSize * specimen.width / specimen.height;
      const normal = shape(photo,'사진 원본 · 정사각형',recordGeometry(0,0,row.photoSize,row.photoSize),null);
      const wide = shape(photo,'사진 원본 · 원래 종횡비',recordGeometry((row.photoSize-wideWidth)/2,0,wideWidth,row.photoSize),null);
      const copyWidth = width-row.inset-14-row.photoSize-row.iconSize-2*row.textGap;
      const labels = frame(master,'기록 정보',recordGeometry(0,0,copyWidth,46),{flow:true});
      labels.layoutSizingHorizontal = 'FILL';
      labels.layoutSizingVertical = 'HUG';
      labels.itemSpacing = 2;
      text(labels,'곤충 이름',plan.strings.unknownName,'recordName',recordGeometry(0,0,copyWidth,24),'text',true);
      text(labels,'발견 날짜','2026.11.23','recordDate',recordGeometry(0,0,copyWidth,20),'textSecondary',true);
      vector(master,'Lucide · ChevronRight','chevron-right',row.iconSize,0,0,true);
      return {master,normalName:normal.name,wideName:wide.name};
    }
    function appendRecord(list,template,record) {
      const instance = track(template.master.createInstance());
      list.appendChild(instance);
      instance.layoutSizingHorizontal = 'FILL';
      instance.layoutSizingVertical = 'FIXED';
      instance.name = record.accessibleName;
      mark(instance,record.recordId,'recordRow',true);
      instance.setPluginData(key('recordId'),record.recordId);
      instance.setPluginData(key('detailId'),record.detailRecordId);
      instance.setPluginData(key('coordinateGroup'),record.publicCoordinateGroup);
      const asset = plan.assets[record.photoId];
      const portrait = asset.dimensions.width === asset.dimensions.height;
      instance.setPluginData(key('credit'),JSON.stringify(asset));
      const normal = instance.findOne(node=>node.name===template.normalName);
      const wide = instance.findOne(node=>node.name===template.wideName);
      const name = instance.findOne(node=>node.name==='곤충 이름');
      const date = instance.findOne(node=>node.name==='발견 날짜');
      if (!normal || !wide || !name || !date) throw new Error('Missing editable record descendants');
      (portrait ? normal : wide).fills = [{type:'IMAGE',imageHash:photoImages[record.photoId].hash,scaleMode:'FIT'}];
      name.characters = record.name;
      date.characters = record.discoveryDate;
      return instance;
    }

    function makeState(state,index,startX,template) {
      const dims = state.layout;
      const root = mark(frame(null,state.frameName,recordGeometry(startX + index * 486,ctx.main.y,390,844)),state.state);
      root.clipsContent = true;
      root.fills = [paint('background')];
      root.setPluginData(key('plan'),plan.digest);
      for (const id of plan.sourceLayerIds) borrow(root,id);
      const selectedIndex = index;
      const {radius,strokeWidth} = layout.cluster.selectedOutline;
      shape(root,'선택 마커 외곽선',dims.selectedOutline,null,{radius,border:'primary',borderWidth:strokeWidth});
      const markers = ctx.markers.map((mapMarker,markerIndex)=>{
        const semantic = markerIndex===0 ? 'record-cluster-three' : 'record-cluster-seven';
        const number = markerIndex===0 ? plan.strings.markerThree : plan.strings.markerSeven;
        const item = mark(borrow(root,mapMarker.id,number),'map-'+semantic,'clusterMarker',true);
        if (markerIndex===selectedIndex) {
          item.setPluginData(key('selected'),'true');
          const background = item.children.find(node=>node.type==='RECTANGLE' && node.width>=60);
          if (background) background.strokes = [paint('primary')];
        }
        return item;
      });
      mark(borrow(root,plan.logoId,'공식 Mapbox 로고',dims.logo),'mapbox-logo');
      mark(borrow(root,plan.attributionId,plan.strings.attribution,dims.attribution),'map-attribution','mapAttribution',true);
      const panel = mark(frame(root,'이 주변 관찰 기록 · 하단 패널',dims.panel),'cluster-panel','clusterPanel');
      panel.cornerRadius = dims.panel.bottomRadius;
      panel.topLeftRadius = dims.panel.topRadius;
      panel.topRightRadius = dims.panel.topRadius;
      panel.fills = [paint('mapPanel')];
      panel.strokes = [paint('mapPanelBorder')];
      panel.strokeAlign = 'INSIDE';
      panel.strokeWeight = 1;
      const { close,title,listViewport } = dims;
      mark(text(panel,'패널 제목',state.countTitle,'panelTitle',recordGeometry(title.x,close.y-dims.panel.y+8,title.width,32),'text'),
        'cluster-panel-title');
      const closeButton = mark(frame(panel,plan.strings.close,recordGeometry(close.x,close.y-dims.panel.y,close.width,close.height)),
        'cluster-panel-close','closeButton',true);
      const inset = (close.width-close.visibleSize)/2;
      shape(closeButton,'닫기 배경',recordGeometry(inset,inset,close.visibleSize,close.visibleSize),'controlFill',{ellipse:true});
      vector(closeButton,'Lucide · X','x',close.iconSize,(close.width-close.iconSize)/2,(close.height-close.iconSize)/2);
      const list = mark(frame(panel,state.records.length===7 ? '기록 목록 · 세로 스크롤' : '기록 목록 · 3건',
        recordGeometry(listViewport.x,listViewport.y-dims.panel.y,listViewport.width,listViewport.height)),'record-list','recordList');
      list.clipsContent = true;
      list.itemSpacing = layout.row.gap;
      if (state.records.length===7) {
        try { list.overflowDirection = 'VERTICAL'; }
        catch (error) { list.overflowDirection = 'VERTICAL_SCROLLING'; }
      }
      state.records.forEach(record=>appendRecord(list,template,record));
      const home = layout.home;
      shape(panel,'홈 인디케이터',recordGeometry(home.x,home.y-dims.panel.y,home.width,home.height),'systemHome',{radius:2});
      for (const id of plan.systemLayerIds) borrow(root,id);
      return {root,markers,closeButton};
    }

    try {
      for (const [id,bytes] of Object.entries(CLUSTER_PHOTOS)) photoImages[id] = figma.createImage(figma.base64Decode(bytes));
      const mainEnd = Math.max(ctx.main.x+ctx.main.width,...ctx.page.children.filter(node=>
        node.y < ctx.main.y+ctx.main.height && node.y+node.height > ctx.main.y && Number.isFinite(node.width)).map(node=>node.x+node.width));
      const startX = mainEnd+96;
      checkpoint = 'editable row master';
      const template = rowMaster(startX+972,ctx.main.y);
      const states = plan.states.map((state,index)=>{
        checkpoint = 'native state '+state.state;
        return makeState(state,index,startX,template);
      });
      checkpoint = 'new frame links';
      for (const [index,state] of states.entries()) {
        await state.closeButton.setReactionsAsync([route(ctx.main.id)]);
        const other = 1-index;
        await state.markers[other].setReactionsAsync([route(states[other].root.id,other===1)]);
      }
      checkpoint = 'original marker links';
      for (const [index,node] of ctx.markers.entries()) {
        touchedMarkers.push(index);
        await node.setReactionsAsync([...before.markerReactions[index].reactions,route(states[index].root.id,index===1)]);
      }
      checkpoint = 'native export';
      const newCtx = await context({fileKey:target.fileKey,planDigest:plan.digest},true);
      const after = await preservation(newCtx);
      return {...await exportNative(newCtx),preservation:{before,after},fonts,
        bindings:Array.from(colors,([name,v])=>({name,id:v.id,variableCollectionId:v.variableCollectionId})),
        imported:Object.entries(photoImages).map(([id,image])=>({id,path:plan.assets[id].path,hash:image.hash}))};
    } catch (error) {
      try {
        for (const index of touchedMarkers.reverse()) await ctx.markers[index].setReactionsAsync(before.markerReactions[index].reactions);
      } finally {
        for (const node of createdNodes.reverse()) if (!node.removed) node.remove();
        if (collection) collection.remove();
      }
      throw new Error(checkpoint+': '+String(error?.message ?? error));
    }
  }

  async function exportNative(ctx) {
    if (ctx.roots.length!==2) throw new Error('Expected two native cluster screens');
    const screens = [];
    for (const state of plan.states) {
      const node = ctx.roots.find(n=>n.getPluginData(key('semantic'))===state.state);
      if (node?.name!==state.frameName) throw new Error('Missing native frame: '+state.state);
      screens.push({state:state.state,tree:exportTree(node),pngBase64:await png(node)});
    }
    const master = ctx.authored.find(node=>node.type==='COMPONENT' && node.getPluginData(key('semantic'))==='row-master');
    if (!master) throw new Error('Missing editable record row component');
    return {...status(ctx),screens,master:exportTree(master)};
  }
  return async (mode,params) => {
    const ctx = await context(params,mode !== 'build');
    if (mode==='status') return status(ctx);
    if (mode==='baseline') return preservation(ctx);
    if (mode==='build') {
      try { return await build(ctx); }
      catch (error) { throw new Error(String(error?.message ?? error)); }
    }
    if (mode==='export') return exportNative(ctx);
    throw new Error('Unsupported cluster adapter command');
  };
})();
