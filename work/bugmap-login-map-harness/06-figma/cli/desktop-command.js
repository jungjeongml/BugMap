async function bugMapLoginStatus() {
  await figma.currentPage.loadAsync();
  const target = BUGMAP_LOGIN_PLAN.target;
  const anchor = figma.currentPage.children.find(node => node.id === target.anchorId);
  const ok = figma.root.name === target.documentName &&
    (!figma.fileKey || figma.fileKey === target.fileKey) &&
    figma.currentPage.id === target.pageId && anchor?.name === target.anchorName;
  const existing = figma.currentPage.children.find(node => node.getPluginData('bugmapLogin05') === BUGMAP_LOGIN_PLAN.digest);
  return { ok, documentName: figma.root.name, pageId: figma.currentPage.id,
    fileKey: figma.fileKey ?? null, anchorId: anchor?.id, existing: existing?.id,
    planDigest: BUGMAP_LOGIN_PLAN.digest, roots: figma.currentPage.children.map(n => ({id:n.id,name:n.name,type:n.type})) };
}

function bugMapLoginPaint(hex) {
  if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(hex)) throw new Error('Invalid approved color');
  const [r,g,b,opacity=1] = hex.slice(1).match(/../g).map(c => parseInt(c,16)/255);
  return {type:'SOLID',color:{r,g,b},opacity};
}

function bugMapLoginPlace(parent, node, x, y, absolute=true) {
  parent.appendChild(node);
  if (absolute && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE';
  if (absolute) {node.x = x; node.y = y;}
  return node;
}

function bugMapLoginAutoFrame(node) {
  const children = node.children.map(child => ({child,x:child.x,y:child.y}));
  node.layoutMode = 'VERTICAL';
  node.primaryAxisSizingMode = 'FIXED';
  node.counterAxisSizingMode = 'FIXED';
  for (const {child,x,y} of children) {
    child.layoutPositioning = 'ABSOLUTE';
    child.x = x;
    child.y = y;
    if (child.type === 'FRAME') bugMapLoginAutoFrame(child);
  }
}

function bugMapLoginSvg(parent, spec) {
  const node = figma.createNodeFromSvg(spec.svg);
  node.name = spec.name;
  bugMapLoginPlace(parent,node,spec.x,spec.y);
  bugMapLoginAutoFrame(node);
  return node;
}

function bugMapLoginImage(parent, spec, maps) {
  const image = figma.createImage(base64ToUint8Array(spec.bytes));
  const node = figma.createRectangle();
  node.name = spec.name;
  node.resize(spec.width,spec.height);
  node.fills = [{type:'IMAGE',scaleMode:'FIT',imageHash:image.hash}];
  maps.push({nodeId:node.id,fillIndex:0,asset:spec.asset,imageHash:image.hash});
  return bugMapLoginPlace(parent,node,spec.x,spec.y);
}

function bugMapLoginText(parent, spec, font) {
  const node = figma.createText();
  node.name = spec.id;
  node.fontName = font;
  node.fontSize = spec.fontSize;
  node.lineHeight = {value:spec.lineHeight,unit:'PIXELS'};
  node.characters = spec.characters;
  node.fills = [bugMapLoginPaint(spec.color)];
  node.textAutoResize = 'WIDTH_AND_HEIGHT';
  const center = spec.center;
  return bugMapLoginPlace(parent,node,center ? spec.x-node.width/2 : spec.x,spec.y);
}

function bugMapLoginExport(node) {
  const result = serializeSceneNode(node);
  // Figma can expose the identity matrix on an unchanged FIT image.
  function visit(shape, out) {
    out.x=shape.x; out.y=shape.y;
    if (typeof shape.cornerRadius === 'number') out.cornerRadius=shape.cornerRadius;
    if (shape.type === 'TEXT') out.fontName=shape.fontName;
    if (shape.type === 'VECTOR') out.pathCount=shape.vectorPaths.length;
    if (out.fills) out.fills=out.fills.map(paint=>({...paint}));
    for (const paint of out.fills ?? []) {
      if (paint.type === 'IMAGE' && ['FIT','FILL'].includes(paint.scaleMode) &&
          JSON.stringify(paint.imageTransform)==='[[1,0,0],[0,1,0]]') delete paint.imageTransform;
    }
    if (out.children) out.children.forEach((child,i)=>visit(shape.children[i],child));
  }
  visit(node,result);
  return result;
}

let bugMapLoginBuilding = false;
async function bugMapLoginBuild(params) {
  if (bugMapLoginBuilding) throw new Error('A BugMap 05 command is already running.');
  bugMapLoginBuilding = true;
  try { return await bugMapLoginBuildOnce(params); }
  finally { bugMapLoginBuilding = false; }
}

async function bugMapLoginBuildOnce(params) {
  const plan=BUGMAP_LOGIN_PLAN;
  const status=await bugMapLoginStatus();
  if (!status.ok || params?.planDigest !== plan.digest || params?.fileKey !== plan.target.fileKey)
    throw new Error('The approved BugMapHaness target or design version does not match.');
  const viewport = plan.layout.viewport;
  let root;
  const images=[];
  try {
    if (status.existing) {
      root=await figma.getNodeByIdAsync(status.existing);
      images.push(...JSON.parse(root.getPluginData('bugmapLoginImages')));
    } else {
      if (status.roots.some(node=>node.name===plan.name)) throw new Error('The target already has a same-named frame.');
      const available=(await figma.listAvailableFontsAsync()).map(record=>record.fontName);
      const fonts={};
      for (const [weight,style] of [[400,'Regular'],[500,'Medium'],[700,'Bold']]) {
        const font=available.find(candidate=>candidate.family==='Apple SD Gothic Neo'&&candidate.style===style)
          ?? available.find(candidate=>candidate.family==='Inter'&&candidate.style===style);
        if(!font)throw new Error('No matching font '+style);
        await figma.loadFontAsync(font);
        fonts[weight]=font;
      }
      const anchor=await figma.getNodeByIdAsync(plan.target.anchorId);
      root=figma.createFrame();
      root.name=plan.name;
      root.resize(viewport.width,viewport.height);
      bugMapLoginAutoFrame(root);
      root.x=anchor.x+anchor.width+96;
      root.y=anchor.y;
      root.clipsContent=true;
      root.fills=[bugMapLoginPaint(plan.colors.canvas)];
      bugMapLoginImage(root,plan.imageSpecs.map,images);
      for(const svg of plan.svgSpecs)bugMapLoginSvg(root,svg);
      for(const label of plan.text)bugMapLoginText(root,label,fonts[label.weight]);

      const stack=figma.createFrame();
      stack.name='소셜 로그인';
      stack.resize(plan.layout.providerStack.width,plan.layout.providerStack.height);
      bugMapLoginAutoFrame(stack);
      stack.itemSpacing=plan.layout.providerStack.gap;
      stack.fills=[];
      bugMapLoginPlace(root,stack,plan.layout.providerStack.x,plan.layout.providerStack.y);
      for(const kind of plan.layout.providerStack.providerOrder){
        const b=plan.layout.providerButton;
        const button=figma.createFrame();
        button.name='providerButton / '+plan.providerLabels[kind];
        button.resize(plan.layout.providerStack.width,b.height);
        bugMapLoginAutoFrame(button);
        button.fills=[bugMapLoginPaint(plan.colors[kind+'Surface'])];
        button.cornerRadius=b.radius;
        button.clipsContent=true;
        const border=plan.colors[kind+'Border'];
        if(border){
          button.strokes=[bugMapLoginPaint(border)];
          button.strokeWeight=1;
          button.strokeAlign='INSIDE';
          button.strokesIncludedInLayout=false;
        }
        bugMapLoginPlace(stack,button,0,0,false);
        button.layoutSizingHorizontal='FILL';
        if(kind==='kakao')bugMapLoginSvg(button,plan.kakaoSvg);
        else bugMapLoginImage(button,plan.imageSpecs[kind],images);
      }
      root.setPluginData('bugmapLogin05',plan.digest);
      root.setPluginData('bugmapLoginImages',JSON.stringify(images));
    }
    const capture=await root.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}});
    return { fileKey:status.fileKey,documentName:status.documentName,pageId:status.pageId,
      planDigest:plan.digest,node:bugMapLoginExport(root),images,
      pngBase64:customBase64Encode(capture),
      roots:figma.currentPage.children.map(n=>({id:n.id,name:n.name,type:n.type})) };
  } catch (error) {
    if(root && !status.existing)root.remove();
    throw error;
  }
}
