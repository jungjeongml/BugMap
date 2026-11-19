const bugMapRecordEntryCommand = (() => {
  const plan = RECORD_ENTRY_PLAN;
  const { target, tokens } = plan;
  const source = target.prototypeSource;
  const tag = 'bugmapRecordEntry09:';
  const keys = ['7:2','19:2',source.nodeId,'50:1081','50:1190'];
  const names = new Set(plan.states.map(state => state.name));
  const clone = value => JSON.parse(JSON.stringify(value));
  const box = (x,y,width,height) => ({x,y,width,height});
  const bounds = n => box(n.x,n.y,n.width,n.height);
  const info = node => ({id:node.id,name:node.name,type:node.type,...bounds(node)});
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const rgb = hex => Object.fromEntries(hex.slice(1).match(/../g).map((pair,index)=>['rgb'[index],parseInt(pair,16)/255]));
  const close = (a,b) => a && b && ['r','g','b'].every(key=>Math.abs(a[key]-b[key])<0.00001) && (a.a??1) === 1;
  const stamp = (node,semantic,component,interactive) => {
    if (semantic) node.setPluginData(tag+'semantic',semantic);
    if (component) node.setPluginData(tag+'component',component);
    if (interactive) node.setPluginData(tag+'interactive','true');
    return node;
  };
  function tree(node, authored=false) {
    const result = {...info(node),fills:Array.isArray(node.fills)?clone(node.fills):[]};
    for (const key of ['opacity','rotation','visible','locked','layoutMode','layoutPositioning','layoutSizingHorizontal','layoutSizingVertical',
      'cornerRadius','topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius','strokeWeight','strokeAlign','clipsContent',
      'overflowDirection','scrollBehavior','strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight','isMask',
      'primaryAxisSizingMode','counterAxisSizingMode','itemSpacing','paddingTop','paddingBottom','paddingLeft','paddingRight','textAutoResize',
      'textAlignHorizontal','textAlignVertical','fontSize','characters','fillStyleId','strokeStyleId','effectStyleId','textStyleId']) {
      if (['number','boolean','string'].includes(typeof node[key])) result[key]=node[key];
    }
    for (const key of ['strokes','effects','reactions','vectorPaths','relativeTransform']) {
      if (Array.isArray(node[key])) result[key]=clone(node[key]);
    }
    for (const key of ['fontName','lineHeight','letterSpacing','constraints','boundVariables','componentProperties','exportSettings']) {
      if (node[key] && typeof node[key]==='object' && Object.keys(node[key]).length) result[key]=clone(node[key]);
    }
    if (authored) {
      const semantic = node.getPluginData(tag+'semantic');
      const component = node.getPluginData(tag+'component');
      const asset = node.type==='RECTANGLE' && node.name==='사진 채우기' ? node.parent?.getPluginData(tag+'asset') : null;
      if (semantic) result.semanticId=semantic;
      if (component) result.componentName=component;
      if (asset) result.assetPath=asset;
      if (node.getPluginData(tag+'interactive')==='true') result.interactive=true;
      const accessibility = node.getPluginData(tag+'a11y');
      if (accessibility) result.accessibility=JSON.parse(accessibility);
    }
    if ('children' in node) result.children=node.children.map(child=>tree(child,authored));
    return result;
  }
  const png = async node => figma.base64Encode(await node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}}));
  const points = page => Array.isArray(page.flowStartingPoints) ? clone(page.flowStartingPoints) : [];
  const nav = destinationId => ({trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId,navigation:'NAVIGATE',transition:null}]});
  const actions = r => r.actions ?? [r.action];
  const hasRoute = (items,destination) => items.some(r=>r.trigger?.type==='ON_CLICK' &&
    actions(r).some(a=>a?.type==='NODE' && a.navigation==='NAVIGATE' && a.destinationId===destination));
  function sameIdentity(main, cta, page) {
    if (main?.name!==source.name || main.type!=='FRAME' || main.parent?.id!==page.id ||
        main.width!==390 || main.height!==844 || cta?.type!=='FRAME' || cta.name!=='발견/채집 기록하기' ||
        cta.width!==184 || cta.height!==48 || !Array.isArray(cta.reactions) || typeof cta.setReactionsAsync!=='function') {
      throw new Error('Existing map or record-entry CTA no longer matches the approved source.');
    }
    let owner=cta.parent;
    while (owner && owner.id!==main.id) owner=owner.parent;
    if (!owner || keys.some(id=>!page.children.some(node=>node.id===id))) throw new Error('Existing login, map, or nearby roots do not match.');
  }
  async function context(params) {
    const page=figma.currentPage;
    const fileKey=figma.fileKey ?? null;
    if (params?.fileKey!==target.fileKey || params?.planDigest!==plan.digest || (fileKey && fileKey!==target.fileKey) ||
        page.id!==target.pageId || page.name!==target.pageName || figma.root.name!==target.documentName) {
      throw new Error('Approved file, page, or plan mismatch.');
    }
    await page.loadAsync();
    const main=await figma.getNodeByIdAsync(source.nodeId);
    const cta=await figma.getNodeByIdAsync(source.recordButtonId);
    sameIdentity(main,cta,page);
    const authored=page.children.filter(node=>node.getPluginData(tag+'plan')===plan.digest);
    const frames=authored.filter(node=>node.type==='FRAME');
    if (page.children.some(node=>names.has(node.name) && !frames.includes(node))) throw new Error('A form name is already in use.');
    return { fileKey,page,main,cta,authored,frames };
  }
  async function inspect(ctx) {
    const colors=(await figma.variables.getLocalVariablesAsync('COLOR')).map(({id,name,variableCollectionId})=>({id,name,variableCollectionId}));
    const fonts=(await figma.listAvailableFontsAsync()).map(item=>item.fontName)
      .filter(font=>['Pretendard','Noto Sans KR','Apple SD Gothic Neo'].includes(font.family) && ['Medium','Bold'].includes(font.style));
    return {fileKey:ctx.fileKey,documentName:figma.root.name,pageId:ctx.page.id,pageName:ctx.page.name,
      planDigest:plan.digest,roots:ctx.page.children.map(info),map:info(ctx.main),
      cta:{...info(ctx.cta),reactions:clone(ctx.cta.reactions)},flowStartingPoints:points(ctx.page),authored:ctx.authored.map(info),
      availableFonts:fonts,existingColors:colors};
  }
  async function preservation(ctx,nodes=ctx.page.children.filter(node=>!ctx.authored.includes(node))) {
    const anchors=[];
    for (const node of nodes) {
      const item={id:node.id,tree:tree(node)};
      if (node.type==='FRAME') item.png=await png(node);
      anchors.push(item);
    }
    return {roots:nodes.map(info),anchors,ctaReactions:clone(ctx.cta.reactions),flowStartingPoints:points(ctx.page)};
  }
  async function chooseFonts() {
    const available=(await figma.listAvailableFontsAsync()).map(item=>item.fontName);
    for (const family of ['Pretendard','Noto Sans KR','Apple SD Gothic Neo']) {
      const medium=available.find(f=>f.family===family&&f.style==='Medium');
      const bold=available.find(f=>f.family===family&&f.style==='Bold');
      if (medium && bold) {
        try {
          await Promise.all([figma.loadFontAsync(medium),figma.loadFontAsync(bold)]);
          return {500:medium,700:bold};
        } catch (error) {
          console.warn('Unable to load '+family+': '+String(error));
        }
      }
    }
    throw new Error('No approved or existing-map-compatible Korean font pair could load.');
  }
  async function exportScreens(ctx) {
    if (ctx.frames.length!==2) throw new Error('Expected exactly two authored form frames.');
    const screens=[];
    for (const state of plan.states) {
      const root=ctx.frames.find(node=>node.getPluginData(tag+'semantic')===state.state && node.name===state.name);
      if (!root) throw new Error('Missing native frame for '+state.state);
      const back=root.findOne(node=>node.getPluginData(tag+'semantic')==='back');
      const scroll=root.findOne(node=>node.getPluginData(tag+'semantic')==='body-viewport');
      const content=root.findOne(node=>node.getPluginData(tag+'semantic')==='body-content');
      if (!back || !scroll || !content || !hasRoute(back.reactions,ctx.main.id) ||
          root.width!==390 || root.height!==844 || !scroll.clipsContent || !String(scroll.overflowDirection).startsWith('VERTICAL') ||
          scroll.height!==state.scroll.height || content.height!==state.scroll.contentHeight) {
        throw new Error('Native scroll, viewport, or back route failed for '+state.state);
      }
      screens.push({state:state.state,tree:tree(root,true),png:await png(root),body:tree(scroll,true),
        bodyContentPng:await png(content),back:{...info(back),reactions:clone(back.reactions)}});
    }
    const ctaDestination=screens.find(s=>s.state==='default').tree.id;
    if (!hasRoute(ctx.cta.reactions,ctaDestination) || hasRoute(ctx.cta.reactions,screens.find(s=>s.state==='ready').tree.id)) {
      throw new Error('Map CTA did not resolve exclusively to the first form.');
    }
    const cabinet=ctx.authored.find(node=>node.type==='SECTION');
    if (!cabinet) throw new Error('Missing in-file component definitions.');
    return { ...await inspect(ctx),screens,componentDefinitions:cabinet.children.map(node=>tree(node,true)) };
  }
  async function build(ctx) {
    if (ctx.authored.length) throw new Error('Record form already exists. Use export to inspect it.');
    const previousReactions=clone(ctx.cta.reactions);
    if (previousReactions.some(r=>r.trigger?.type==='ON_CLICK')) {
      throw new Error('Existing CTA already has an ON_CLICK reaction. Resolve the conflict before authoring.');
    }
    const initialRoots=[...ctx.page.children];
    const before=await preservation(ctx,initialRoots);
    const fonts=await chooseFonts();
    const existing=await figma.variables.getLocalVariablesAsync('COLOR');
    const used={};
    const images={};
    const owned=new Set();
    let collection;
    let cabinet;
    const components=new Map();
    const create = method => {
      const node=figma[method]();
      owned.add(node);
      return node;
    };
    function paint(key, opacity=1) {
      const color=rgb(tokens.colors[key]);
      if (!used[key]) {
        let variable=existing.find(item=>item.name===key && Object.values(item.valuesByMode).every(value=>close(value,color)));
        if (!variable) {
          collection=collection??figma.variables.createVariableCollection('BugMap · 발견·채집 기록');
          variable=figma.variables.createVariable(key,collection,'COLOR');
          variable.setValueForMode(collection.defaultModeId,{...color,a:1});
        }
        used[key]=variable;
      }
      return figma.variables.setBoundVariableForPaint({type:'SOLID',color,opacity},'color',used[key]);
    }
    function place(parent,node,x,y,flow=false) {
      if (parent) parent.appendChild(node);
      if (parent?.layoutMode && parent.layoutMode!=='NONE' && !flow) node.layoutPositioning='ABSOLUTE';
      if (!flow) {
        node.x=x;
        node.y=y;
      }
      return node;
    }
    function frame(parent,name,rectangle,method='createFrame',flow=false) {
      const node=create(method);
      node.name=name;
      node.layoutMode='VERTICAL';
      node.primaryAxisSizingMode='FIXED';
      node.counterAxisSizingMode='FIXED';
      node.resize(rectangle.width,rectangle.height);
      node.fills=[];
      node.clipsContent=false;
      return place(parent,node,rectangle.x,rectangle.y,flow);
    }
    function shape(parent,spec,x,y) {
      const node=create(spec.kind==='circle'?'createEllipse':'createRectangle');
      node.name=spec.id;
      node.resize(spec.width,spec.height);
      if (spec.kind!=='circle') node.cornerRadius=spec.radius;
      node.fills=spec.color?[paint(spec.color)]:[];
      if (spec.stroke) {
        node.strokes=[paint(spec.stroke)];
        node.strokeAlign='INSIDE';
        node.strokeWeight=1;
      }
      return place(parent,node,spec.x-x,spec.y-y);
    }
    function label(parent,spec,x,y) {
      const node=create('createText');
      const font=Object.values(tokens.typography).find(type=>type.fontSize===spec.fontSize&&type.fontWeight===spec.fontWeight);
      if (!font) throw new Error('Missing approved typography for '+spec.id);
      node.name=spec.text;
      node.fontName=fonts[spec.fontWeight];
      node.fontSize=spec.fontSize;
      node.lineHeight={unit:'PIXELS',value:font.lineHeight};
      node.characters=spec.text;
      node.fills=[paint(spec.color)];
      node.textAutoResize='WIDTH_AND_HEIGHT';
      const offset=spec.anchor==='middle'?node.width/2:spec.anchor==='end'?node.width:0;
      return place(parent,node,spec.x-x-offset,spec.y-y-node.height/2);
    }
    function bindIcon(node) {
      if (node.type==='VECTOR' && node.vectorPaths?.length && node.vectorPaths.every(path=>path.windingRule==='NONE')) {
        node.fills=[];
      }
      for (const key of ['fills','strokes']) {
        if (!Array.isArray(node[key]) || !node[key].length) continue;
        node[key]=node[key].map(item=>{
          if (item.type!=='SOLID') return item;
          const matching=Object.keys(tokens.colors).find(token=>close(item.color,rgb(tokens.colors[token])));
          return matching?paint(matching,item.opacity??1):item;
        });
      }
      if ('children' in node) node.children.forEach(bindIcon);
    }
    function visual(parent,spec,x,y) {
      if (spec.kind==='label') return label(parent,spec,x,y);
      if (spec.kind==='vector') {
        const imported=figma.createNodeFromSvg(spec.svg);
        owned.add(imported);
        const wrap=frame(parent,spec.id,box(spec.x-x,spec.y-y,spec.width,spec.height));
        try {
          if (!imported.children.length) throw new Error('Empty imported vector for '+spec.id);
          const group=figma.group([...imported.children],imported);
          group.name=spec.id+' · 벡터';
          place(wrap,group,group.x,group.y);
          bindIcon(group);
        } finally {
          imported.remove();
        }
        return wrap;
      }
      return shape(parent,spec,x,y);
    }
    function master(key,name,component,rect,buildChildren) {
      if (!components.has(key)) {
        const index=components.size;
        const node=frame(cabinet,name,box(24+(index%2)*390,32+Math.floor(index/2)*124,rect.width,rect.height),'createComponent');
        stamp(node,null,component);
        node.description=component+'. 승인된 발견·채집 기록 화면용.';
        buildChildren(node);
        components.set(key,node);
      }
      return components.get(key);
    }
    function buildControl(parent,spec,x,y) {
      const recipe=spec.children.map(({id,...part})=>({...part,x:part.x-spec.x,y:part.y-spec.y}));
      const key=JSON.stringify([spec.component,spec.width,spec.height,recipe]);
      const name=spec.component+' · '+spec.label+(spec.enabled?'':' · 비활성');
      const definition=master(key,name,spec.component,spec,node=>{
        spec.children.forEach(child=>visual(node,child,spec.x,spec.y));
      });
      const item=definition.createInstance();
      owned.add(item);
      item.name=spec.label;
      stamp(item,spec.id,spec.component,true);
      item.setPluginData(tag+'a11y',JSON.stringify({role:spec.role,label:spec.label,action:spec.action,
        enabled:spec.enabled,selected:spec.selected,multiline:spec.multiline}));
      return place(parent,item,spec.x-x,spec.y-y);
    }
    function buildPhoto(parent,spec,x,y) {
      const definition=master('specimen-photo','PhotoThumb · 표본 사진','PhotoThumb',spec,node=>{
        shape(node,{...spec,kind:'rect',id:'사진 채우기'},spec.x,spec.y);
      });
      const item=definition.createInstance();
      owned.add(item);
      const credit=plan.assets[spec.asset];
      item.name='표본 사진 '+spec.id.split('-').at(-1)+' · '+credit.author;
      stamp(item,spec.id,'PhotoThumb');
      const image=item.children[0];
      image.fills=[{type:'IMAGE',imageHash:images[spec.asset].hash,scaleMode:'FIT'}];
      item.setPluginData(tag+'asset',credit.path);
      item.setPluginData(tag+'credit',JSON.stringify(credit));
      return place(parent,item,spec.x-x,spec.y-y);
    }
    function layoutChild(parent,child,originX,originY) {
      if (child.kind==='control') return buildControl(parent,child,originX,originY);
      if (child.kind==='labels') return child.children.forEach(item=>visual(parent,item,originX,originY));
      if (child.kind==='photo') return buildPhoto(parent,child,originX,originY);
      return visual(parent,child,originX,originY);
    }
    const buildState = (state,index,startX) => {
      const root=stamp(frame(null,state.name,box(startX+index*486,ctx.main.y,390,844)),state.state,'RecordEntryScreen');
      root.setPluginData(tag+'plan',plan.digest);
      root.fills=[paint('background')];
      root.clipsContent=true;
      const header=stamp(frame(root,'제목과 뒤로 가기 · 고정',box(0,0,390,tokens.layout.header.height)),'fixed-header','EntryHeader');
      for (const item of state.header) layoutChild(header,item,0,0);
      const body=stamp(frame(root,'작성 폼 · 세로 스크롤',state.scroll),'body-viewport');
      body.clipsContent=true;
      try { body.overflowDirection='VERTICAL'; }
      catch (error) { body.overflowDirection='VERTICAL_SCROLLING'; }
      const content=stamp(frame(body,'작성 폼 · 전체 입력',box(0,0,state.width,state.scroll.contentHeight),'createFrame',true),'body-content');
      for (const { key,name,children } of state.sections) {
        const y=Math.min(...children.map(child=>child.y));
        const end=Math.max(...children.map(child=>child.y+child.height));
        const group=stamp(frame(content,name,box(0,y-state.scroll.y,390,end-y)),key+'-section');
        children.forEach(item=>layoutChild(group,item,0,y));
      }
      visual(root,state.indicator,0,0);
      const footerLayout=tokens.layout.footer;
      const footer=stamp(frame(root,'작성완료 · 고정',box(0,footerLayout.y,390,footerLayout.height)),'fixed-footer','EntrySubmit');
      footer.fills=[paint('formFooter')];
      for (const item of state.footer) layoutChild(footer,item,0,footerLayout.y);
      return root;
    };
    try {
      for (const key of Object.keys(plan.assets)) images[key]=figma.createImage(figma.base64Decode(RECORD_ENTRY_ASSET_BYTES[key]));
      const end=Math.max(...initialRoots.filter(node=>typeof node.x==='number'&&typeof node.width==='number').map(node=>node.x+node.width));
      const startX=end+96;
      cabinet=create('createSection');
      cabinet.name='09 · 발견·채집 기록 / 컴포넌트';
      cabinet.setPluginData(tag+'plan',plan.digest);
      cabinet.resizeWithoutConstraints(790,1400);
      cabinet.x=startX+972;
      cabinet.y=ctx.main.y;
      const roots=plan.states.map((state,index)=>buildState(state,index,startX));
      cabinet.resizeWithoutConstraints(790,Math.ceil(components.size/2)*124+48);
      for (const root of roots) {
        const back=root.findOne(node=>node.getPluginData(tag+'semantic')==='back');
        if (!back) throw new Error('Missing back action for '+root.name);
        await back.setReactionsAsync([nav(ctx.main.id)]);
      }
      await ctx.cta.setReactionsAsync([...previousReactions,nav(roots[0].id)]);
      const afterContext=await context({fileKey:target.fileKey,planDigest:plan.digest});
      const after=await preservation(afterContext,initialRoots);
      if (!equal(before.roots,after.roots) || !equal(after.ctaReactions.slice(0,-1),before.ctaReactions) ||
          after.ctaReactions.length!==before.ctaReactions.length+1) {
        throw new Error('Existing page roots or non-record reactions changed.');
      }
      const oldPoints=after.flowStartingPoints.filter(point=>initialRoots.some(node=>node.id===point.nodeId));
      if (!equal(before.flowStartingPoints,oldPoints)) throw new Error('Existing prototype flow starts changed.');
      const normalized=clone(after.anchors);
      const find=(node,id)=>node.id===id?node:node.children?.map(child=>find(child,id)).find(Boolean);
      const changedCta=find(normalized.find(item=>item.id===ctx.main.id).tree,ctx.cta.id);
      changedCta.reactions=before.ctaReactions;
      if (!equal(before.anchors,normalized)) throw new Error('Existing native trees or PNGs differ beyond the CTA reaction.');
      return {...await exportScreens(afterContext),preservation:{before,after},fonts,
        variables:Object.entries(used).map(([name,v])=>({name,id:v.id,variableCollectionId:v.variableCollectionId}))};
    } catch (error) {
      const restoration=[];
      if (!equal(ctx.cta.reactions,previousReactions)) {
        try { await ctx.cta.setReactionsAsync(previousReactions); }
        catch (issue) { restoration.push(String(issue)); }
      }
      for (const node of [...owned].reverse()) {
        if (!node.removed) {
          try { node.remove(); } catch (issue) { restoration.push(String(issue)); }
        }
      }
      if (collection) {
        try { collection.remove(); } catch (issue) { restoration.push(String(issue)); }
      }
      if (!equal(points(ctx.page),before.flowStartingPoints)) {
        try { ctx.page.flowStartingPoints=before.flowStartingPoints; }
        catch (issue) { restoration.push(String(issue)); }
      }
      if (restoration.length) throw new Error(String(error)+'; rollback issues: '+restoration.join(', '));
      throw error;
    }
  }
  async function repairIconFills(ctx) {
    const expected=[
      {state:'default',screen:'61:1295',master:'61:1355',instance:'I61:1360;61:1355'},
      {state:'ready',screen:'61:1552',master:'61:1603',instance:'I61:1608;61:1603'},
    ];
    const before=await exportScreens(ctx);
    const originals=await preservation(ctx);
    const repairs=[];
    for (const target of expected) {
      const screen=before.screens.find(screen=>screen.state===target.state);
      const master=await figma.getNodeByIdAsync(target.master);
      const instance=await figma.getNodeByIdAsync(target.instance);
      if (screen?.tree.id!==target.screen || master?.type!=='VECTOR' || instance?.type!=='VECTOR' ||
          master.parent?.name!=='gallery-icon · 벡터' || instance.parent?.name!=='gallery-icon · 벡터' ||
          master.parent?.parent?.parent?.parent?.id!==ctx.authored.find(node=>node.type==='SECTION')?.id ||
          master.vectorPaths.length!==1 || master.vectorPaths[0].windingRule!=='NONE' ||
          master.fills.length!==1 || master.fills[0].type!=='SOLID' || !close(master.fills[0].color,{r:0,g:0,b:0}) ||
          !equal(master.fills,instance.fills)) {
        throw new Error('Exact authored Lucide master/instance conditions did not match.');
      }
      repairs.push({master,instance,prior:clone(master.fills)});
    }
    try {
      for (const repair of repairs) repair.master.fills=[];
      const verified=await exportScreens(ctx);
      const after=await preservation(ctx);
      if (!equal(originals,after)) throw new Error('Existing page roots or reactions differ after icon repair.');
      const find=(node,id)=>node.id===id?node:node.children?.map(child=>find(child,id)).find(Boolean);
      for (const item of repairs) {
        if (item.master.fills.length || item.instance.fills.length) throw new Error('Native vector fill removal failed.');
      }
      const normalized=clone(verified);
      for (const [index,target] of expected.entries()) {
        const original=repairs[index].prior;
        for (const tree of [normalized.screens[index].tree,normalized.screens[index].body]) find(tree,target.instance).fills=original;
        normalized.componentDefinitions.map(tree=>find(tree,target.master)).find(Boolean).fills=original;
      }
      if (!equal(before,normalized)) throw new Error('Native icon repair changed unrelated form properties or rendered pixels.');
      return {...verified,repair:{existing:after,masters:expected.map(({master})=>master),
        instances:expected.map(({instance})=>instance),sameVisiblePixels:true}};
    } catch (error) {
      for (const repair of repairs) repair.master.fills=repair.prior;
      throw error;
    }
  }
  return async (mode,params) => {
    const ctx=await context(params);
    if (mode==='status') return inspect(ctx);
    if (mode==='baseline') return preservation(ctx);
    if (mode==='build') return build(ctx);
    if (mode==='export') return exportScreens(ctx);
    if (mode==='repair') return repairIconFills(ctx);
    throw new Error('Unknown record-entry command.');
  };
})();
