const NAMESPACE = 'bugmapMainMap07';
const WIDTH = PLAN.viewport.width;
const HEIGHT = PLAN.viewport.height;

function channels(hex) {
  return hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
}

function paint(hex) {
  const [r, g, b, opacity = 1] = channels(hex);
  return {type:'SOLID', color:{r,g,b}, opacity};
}

function rootInfo(node) {
  return {id:node.id, name:node.name, type:node.type, x:node.x, y:node.y, width:node.width, height:node.height};
}

async function status() {
  const page = figma.currentPage;
  const target = PLAN.target;
  await page.loadAsync();
  const roots = page.children.map(rootInfo);
  const anchors = target.existingFrames.every(({id, name}) =>
    roots.some((node) => node.id === id && node.name === name && node.type === 'FRAME'));
  const existing = page.children.filter((node) => node.getPluginData(NAMESPACE) === PLAN.digest);
  const collision = roots.some((node) => node.name === PLAN.name && !existing.some((match) => match.id === node.id));
  const documentName = figma.root.name;
  const fileKey = figma.fileKey ?? null;
  const approvedNames = [target.documentName, 'BugMapHarness'];
  const ok = approvedNames.includes(documentName) && page.id === target.pageId &&
    page.name === target.pageName && (!fileKey || fileKey === target.fileKey) &&
    anchors && existing.length < 2 && !collision;
  return {ok, documentName, pageId:page.id, pageName:page.name, fileKey, existing:existing[0]?.id ?? null,
    roots, planDigest:PLAN.digest};
}

function requireTarget(info, params) {
  if (!info.ok || params?.fileKey !== PLAN.target.fileKey || params?.planDigest !== PLAN.digest) {
    throw new Error('Wrong BugMapHaness page, anchors, or approved design digest. No changes made.');
  }
}

function place(parent, node, x, y, position = 'ABSOLUTE') {
  parent.appendChild(node);
  if (parent.layoutMode !== 'NONE') node.layoutPositioning = position;
  if (position === 'ABSOLUTE') {
    node.x = x;
    node.y = y;
  }
  return node;
}

function closeNumber(a, b) {
  return Math.abs(a-b) < 0.025;
}

function vectorFrame(name, svg, bounds) {
  let imported = figma.createNodeFromSvg(svg);
  let wrapper;
  try {
    if (!imported.children.length) throw new Error('SVG imported no layers: ' + name);
    const artwork = figma.group([...imported.children], imported);
    const x = artwork.x;
    const y = artwork.y;
    wrapper = frame(null, name, bounds);
    artwork.name = name + ' · 벡터';
    place(wrapper, artwork, x, y);
    imported.remove();
    return wrapper;
  } catch (error) {
    if (wrapper && !wrapper.removed) wrapper.remove();
    if (!imported.removed) imported.remove();
    // Leave native SVG coordinates untouched if this editor cannot group the artwork.
    imported = figma.createNodeFromSvg(svg);
    imported.name = name;
    imported.fills = [];
    if (!closeNumber(imported.width,bounds.width) || !closeNumber(imported.height,bounds.height)) {
      imported.remove();
      throw new Error(name + ': cannot preserve the SVG viewport: ' + String(error));
    }
    return imported;
  }
}

function frame(parent, name, bounds, options = {}) {
  const node = options.component ? figma.createComponent() : figma.createFrame();
  node.name = name;
  node.resize(bounds.width, bounds.height);
  node.layoutMode = options.direction ?? 'VERTICAL';
  node.primaryAxisSizingMode = 'FIXED';
  node.counterAxisSizingMode = 'FIXED';
  node.fills = [];
  node.clipsContent = false;
  if (parent) place(parent, node, bounds.x, bounds.y, options.position);
  return node;
}

function exportTree(node) {
  const out = {...rootInfo(node), opacity:node.opacity, rotation:node.rotation, visible:node.visible,
    fills:Array.from(Array.isArray(node.fills) ? node.fills : [], (fill) => ({...fill}))};
  if (node.type === 'FRAME' || node.type === 'COMPONENT') out.layoutMode = node.layoutMode;
  if (node.layoutPositioning) out.layoutPositioning = node.layoutPositioning;
  for (const key of ['cornerRadius', 'strokeWeight', 'strokeAlign', 'clipsContent', 'strokeTopWeight', 'strokeRightWeight',
    'strokeBottomWeight', 'strokeLeftWeight', 'isMask']) {
    if (['number','boolean','string'].includes(typeof node[key])) out[key] = node[key];
  }
  if (Array.isArray(node.strokes)) out.strokes = node.strokes;
  if (Array.isArray(node.effects)) out.effects = node.effects;
  if (node.type === 'TEXT') {
    out.characters = node.characters;
    out.fontName = node.fontName;
    out.fontSize = node.fontSize;
    out.lineHeight = node.lineHeight;
  }
  if (node.type === 'VECTOR') out.vectorPaths = node.vectorPaths;
  if (node.getPluginData(NAMESPACE + ':interactive') === 'true') out.interactive = true;
  const componentName = node.getPluginData(NAMESPACE + ':component');
  if (componentName) out.componentName = componentName;
  if (node.boundVariables && Object.keys(node.boundVariables).length) out.boundVariables = node.boundVariables;
  if ('children' in node) out.children = node.children.map(exportTree);
  return out;
}

function asBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index], b = bytes[index + 1] ?? 0, c = bytes[index + 2] ?? 0;
    result += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] +
      (index + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
      (index + 2 < bytes.length ? alphabet[c & 63] : '=');
  }
  return result;
}

async function capture(node) {
  return asBase64(await node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}}));
}

async function snapshotAnchors() {
  const entries = [];
  for (const {id} of PLAN.target.existingFrames) {
    const node = await figma.getNodeByIdAsync(id);
    entries.push({id, tree:exportTree(node), png:await capture(node)});
  }
  return entries;
}

function componentTag(node, component, interactive = false) {
  node.setPluginData(NAMESPACE + ':component', component);
  if (interactive) node.setPluginData(NAMESPACE + ':interactive', 'true');
  return node;
}

async function selectFonts() {
  const available = (await figma.listAvailableFontsAsync()).map((entry) => entry.fontName);
  for (const family of ['Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo']) {
    const medium = available.find((name) => name.family === family && name.style === 'Medium');
    const bold = available.find((name) => name.family === family && name.style === 'Bold');
    if (!medium || !bold) continue;
    try {
      await Promise.all([figma.loadFontAsync(medium), figma.loadFontAsync(bold)]);
      return {500:medium, 700:bold};
    } catch {
      // Continue to a Korean-compatible family if an available font fails to load.
    }
  }
  throw new Error('Pretendard and available Korean-compatible alternatives failed to load.');
}

function statusArtwork() {
  return PLAN.system.replace('<path d="M23 4.5v3"','<path fill="none" d="M23 4.5v3"');
}

function drawLayers(root, fonts, collection) {
  const variables = new Map();
  const color = (token) => {
    const hex = PLAN.colors[token];
    if (!hex) throw new Error('Missing approved color ' + token);
    if (!variables.has(token)) {
      const variable = figma.variables.createVariable(token, collection, 'COLOR');
      const [r,g,b,a=1] = channels(hex);
      variable.setValueForMode(collection.defaultModeId, {r,g,b,a});
      variables.set(token, variable);
    }
    return figma.variables.setBoundVariableForPaint(paint(hex), 'color', variables.get(token));
  };
  const byBlock = (id) => PLAN.blocks[id];
  const bounds = (x,y,width,height) => ({x,y,width,height});
  const rect = (parent, name, box, token, radius = 0, border) => {
    const node = figma.createRectangle();
    node.name = name;
    node.resize(box.width, box.height);
    node.cornerRadius = radius;
    node.fills = [color(token)];
    if (border) {
      node.strokes = [color(border)];
      node.strokeAlign = 'INSIDE';
      node.strokeWeight = 1;
    }
    return place(parent, node, box.x, box.y);
  };
  const circle = (parent, name, centerX, centerY, radius, token, outline, width = 1) => {
    const node = figma.createEllipse();
    node.name = name;
    node.resize(radius * 2, radius * 2);
    node.fills = [color(token)];
    if (outline) {
      node.strokes = [color(outline)];
      node.strokeWeight = width;
      node.strokeAlign = 'CENTER';
    }
    return place(parent, node, centerX-radius, centerY-radius);
  };
  const label = (parent, id, token, typography, x, y, middle = false, outline = false) => {
    const node = figma.createText();
    const spec = PLAN.texts[id];
    node.name = spec.text;
    node.fontName = fonts[spec.fontWeight];
    node.fontSize = spec.fontSize;
    node.lineHeight = {unit:'PIXELS',value:PLAN.typography[typography].lineHeight};
    node.characters = spec.text;
    node.fills = [color(token)];
    node.textAutoResize = 'WIDTH_AND_HEIGHT';
    if (outline) {
      node.strokes = [color('mapLabelOutline')];
      node.strokeWeight = 3;
      node.strokeJoin = 'ROUND';
      node.strokeAlign = 'OUTSIDE';
    }
    return place(parent, node, middle ? x-node.width/2 : x, y-node.height/2);
  };
  const vector = (parent, name, svg, box) =>
    place(parent,vectorFrame(name,svg,box),box.x,box.y);
  const icon = (parent, key, x, y) => {
    const {svg,size} = PLAN.icons[key];
    return vector(parent, 'Lucide · ' + key, svg, bounds(x,y,size,size));
  };
  const control = (parent, component, caption, box, options) =>
    componentTag(frame(parent, caption, box, options), component, true);

  root.fills = [color('background')];
  const canvas = componentTag(vector(root, '지도 바탕 · 시연용 벡터', PLAN.map, bounds(0,0,WIDTH,HEIGHT)), 'MapCanvas');
  canvas.clipsContent = true;
  label(root,'map-north','mapLabel','mapLabel',260,126,false,true);
  label(root,'map-park','mapLabel','parkLabel',123,247,false,true);
  label(root,'map-river','mapWaterLabel','riverLabel',168,500,false,true);

  const master = frame(root, 'RecordCluster · 원본 컴포넌트', bounds(WIDTH+96,0,64,44), {component:true});
  master.description = '공개 관찰·채집 기록의 총 건수 배지';
  rect(master,'배지',bounds(0,6,64,32),'observationMarkerSurface',16,'observationMarkerBorder');
  circle(master,'기록 점',12,22,2.5,'primary');
  const textKey = master.addComponentProperty('기록 건수', 'TEXT', PLAN.copy.clusterSeven);
  const mainLabel = label(master,'label-cluster-seven','text','cluster',36,22,true);
  mainLabel.resize(42, mainLabel.height);
  mainLabel.textAutoResize = 'HEIGHT';
  mainLabel.textAlignHorizontal = 'CENTER';
  mainLabel.x = 15;
  mainLabel.componentPropertyReferences = {characters:textKey};
  for (const [key,copyKey] of [['seven','clusterSeven'],['three','clusterThree'],['five','clusterFive']]) {
    const box = byBlock('record-cluster-' + key);
    const instance = master.createInstance();
    instance.setProperties({[textKey]:PLAN.copy[copyKey]});
    instance.name = PLAN.copy[copyKey + 'Accessible'];
    place(root, componentTag(instance,'RecordCluster',true), box.x, box.y);
  }

  const location = componentTag(frame(root,'현재 위치 · 시연',bounds(164,289,82,36)), 'CurrentLocation');
  circle(location,'위치 도달 표시',18,18,18,'locationHalo');
  circle(location,'GPS 위치점',18,18,6,'location','background',2);
  label(location,'location-label','text','location',37,18,false,true);

  vector(root,'공식 Mapbox 로고',PLAN.logo,PLAN.layout.logo);
  const attribution = control(root,'Attribution',PLAN.copy.attribution,byBlock('map-attribution'));
  circle(attribution,'출처 배경',22,22,14,'observationMarkerSurface','mapPanelBorder');
  icon(attribution,'attribution',13,13);

  const gps = control(root,'LocateButton',PLAN.copy.gps,byBlock('gps'));
  circle(gps,'GPS 버튼 배경',24,24,23.5,'observationMarkerSurface','mapPanelBorder');
  icon(gps,'gps',12,12);

  const record = control(root,'RecordButton',PLAN.copy.record,byBlock('record'));
  record.cornerRadius = 24;
  record.fills = [color('primary')];
  icon(record,'record',16,12);
  label(record,'record-label','onPrimary','action',48,24);

  const sheet = componentTag(frame(root,'하단 패널 · 축소', PLAN.layout.sheet), 'MapSheet');
  sheet.fills = [color('mapPanel')];
  sheet.topLeftRadius = PLAN.layout.sheet.topRadius;
  sheet.topRightRadius = PLAN.layout.sheet.topRadius;
  sheet.strokes = [color('mapPanelBorder')];
  sheet.strokeAlign = 'INSIDE';
  sheet.strokeWeight = 1;
  sheet.clipsContent = true;
  const handle = control(sheet,'MapSheet',PLAN.copy.expand,bounds(0,0,WIDTH,44));
  const handleBox = PLAN.layout.handle;
  rect(handle,'드래그 손잡이',bounds(handleBox.x,handleBox.y-PLAN.layout.sheet.y,handleBox.width,handleBox.height),'sheetHandle',2);

  const search = control(sheet,'Search',PLAN.copy.search,bounds(16,44,358,48));
  search.cornerRadius = PLAN.layout.search.radius;
  search.fills = [color('searchSurface')];
  search.strokes = [color('searchBorder')];
  search.strokeAlign = 'INSIDE';
  search.strokeWeight = 1;
  icon(search,'search',14,12);
  label(search,'search-placeholder','textPlaceholder','search',48,24);

  const tabBar = frame(sheet,'하단 메뉴',bounds(16,100,358,52), {direction:'HORIZONTAL'});
  tabBar.itemSpacing = 5;
  for (const [key,copyKey] of [['map','tabMap'],['community','tabCommunity'],['chat','tabChat'],['my','tabMy']]) {
    const box = byBlock('tab-' + key);
    const tab = control(tabBar,'MapTab',PLAN.copy[copyKey] + (box.selected ? ' · 선택' : ''),box,{position:'AUTO'});
    const center = box.width/2;
    if (box.selected) {
      tab.cornerRadius = PLAN.layout.tab.radius;
      tab.strokes = [color('activeTabBorder')];
      tab.strokeAlign = 'INSIDE';
      tab.strokeWeight = 1;
      tab.fills = [color('activeTabSurface')];
    }
    icon(tab,'tab-' + key,center-12,6);
    label(tab,'tab-label-' + key,box.selected ? 'primary' : 'textSecondary','tab',center,40,true);
  }

  const home = PLAN.layout.home;
  rect(sheet,'홈 인디케이터',bounds(home.x,home.y-PLAN.layout.sheet.y,home.width,home.height),'systemHome',2);
  label(root,'time','systemInk','systemTime',24,27);
  vector(root,'iOS · 통신과 배터리',statusArtwork(),bounds(304,20,68,14));
  return [...variables.values()].map((variable) => ({id:variable.id,name:variable.name}));
}

let running = false;

async function build(params) {
  const before = await status();
  requireTarget(before,params);
  if (before.existing) return exportMain(params);
  const fonts = await selectFonts();
  const baseline = await snapshotAnchors();
  const anchor = await figma.getNodeByIdAsync('19:2');
  const immediatelyBefore = await status();
  requireTarget(immediatelyBefore, params);
  if (JSON.stringify(before.roots) !== JSON.stringify(immediatelyBefore.roots)) {
    throw new Error('Figma roots changed during preflight. No changes made.');
  }
  let root;
  let collection;
  try {
    root = frame(null,PLAN.name,{width:WIDTH,height:HEIGHT});
    root.x = anchor.x + anchor.width + 96;
    root.y = anchor.y;
    root.clipsContent = true;
    root.setPluginData(NAMESPACE, PLAN.digest);
    root.setPluginData(NAMESPACE + ':fonts', JSON.stringify(fonts));
    collection = figma.variables.createVariableCollection('BugMap · 발견 지도 07');
    collection.renameMode(collection.defaultModeId,'Dark');
    const variables = drawLayers(root, fonts, collection);
    const tree = exportTree(root);
    const pngBase64 = await capture(root);
    const after = await status();
    const unchanged = await snapshotAnchors();
    if (!after.ok || JSON.stringify(baseline) !== JSON.stringify(unchanged) ||
        JSON.stringify(before.roots) !== JSON.stringify(after.roots.filter((node) => node.id !== root.id))) {
      throw new Error('Existing Figma roots changed before evidence could be verified.');
    }
    return {before, after, tree, pngBase64, fonts, variables,
      preservation:{before:baseline,after:unchanged}};
  } catch (error) {
    if (root && !root.removed) root.remove();
    if (collection) collection.remove();
    throw error;
  }
}

async function exportMain(params) {
  const info = await status();
  requireTarget(info,params);
  if (!info.existing) throw new Error('No screen with the approved plan digest exists.');
  const root = await figma.getNodeByIdAsync(info.existing);
  const tree = exportTree(root);
  const pngBase64 = await capture(root);
  return {before:info,after:info,tree,pngBase64,
    fonts:JSON.parse(root.getPluginData(NAMESPACE + ':fonts')),preservation:null};
}

const REPAIR_MARK = NAMESPACE + ':nativeGeometry';
const REPAIR_VERSION = '1';

function repairSlots(root) {
  const named = (name) => {
    const matches = root.findAll((node) => node.name === name);
    if (matches.length !== 1) throw new Error('Expected exactly one existing repair layer: ' + name);
    return matches[0];
  };
  const entries = [
    ['지도 바탕 · 시연용 벡터',PLAN.map,{width:WIDTH,height:HEIGHT,x:0,y:0}],
    ['공식 Mapbox 로고',PLAN.logo,PLAN.layout.logo],
    ['iOS · 통신과 배터리',statusArtwork(),{width:68,height:14,x:304,y:20}],
    ...Object.entries(PLAN.icons).map(([key,{svg,size}]) =>
      ['Lucide · ' + key,svg,{width:size,height:size}]),
  ];
  return entries.map(([name,svg,bounds]) => {
    const previous = named(name);
    if (previous.type !== 'FRAME' || previous.layoutPositioning !== 'ABSOLUTE' || !previous.visible ||
        !closeNumber(previous.width,bounds.width) || !closeNumber(previous.height,bounds.height) ||
        ('x' in bounds && (!closeNumber(previous.x,bounds.x) || !closeNumber(previous.y,bounds.y)))) {
      throw new Error('Existing layer does not match its approved slot: ' + name);
    }
    return {previous,name,svg,bounds};
  });
}

function assertMapExtent(map) {
  const [mx,my] = [map.absoluteTransform[0][2],map.absoluteTransform[1][2]];
  const land = map.findAll((node) => ['VECTOR','RECTANGLE'].includes(node.type) &&
    closeNumber(node.width,WIDTH) && closeNumber(node.height,HEIGHT) &&
    closeNumber(node.absoluteTransform[0][2],mx) && closeNumber(node.absoluteTransform[1][2],my));
  if (!land.length) throw new Error('Native map land failed to cover the approved frame.');
}

async function repair(params) {
  const before = await status();
  requireTarget(before,params);
  if (before.existing !== '41:81') throw new Error('Repair requires precisely the previously created frame 41:81.');
  const root = await figma.getNodeByIdAsync(before.existing);
  const slots = repairSlots(root);
  if (root.getPluginData(REPAIR_MARK) === REPAIR_VERSION) {
    assertMapExtent(slots[0].previous);
    return exportMain(params);
  }
  const halos = root.findAll((node) => node.name === '위치 도달 표시');
  if (halos.length !== 1 || halos[0].type !== 'ELLIPSE') throw new Error('Expected the existing GPS halo.');
  const halo = halos[0];
  const oldPaints = halo.fills;
  const approvedHalo = paint(PLAN.colors.locationHalo);
  const a = approvedHalo.opacity;
  const fonts = JSON.parse(root.getPluginData(NAMESPACE + ':fonts'));
  const baseline = await snapshotAnchors();
  const immediatelyBefore = await status();
  requireTarget(immediatelyBefore,params);
  if (JSON.stringify(immediatelyBefore.roots) !== JSON.stringify(before.roots)) {
    throw new Error('Figma roots changed during repair preflight. No changes made.');
  }

  const staged = [];
  const geometry = [];
  let phase = 'prepare';
  try {
    for (const {previous,name,svg,bounds} of slots) {
      phase = 'native SVG: ' + name;
      const replacement = vectorFrame(name,svg,bounds);
      staged.push({previous,replacement});
      replacement.visible = false;
      replacement.clipsContent = previous.clipsContent;
      const componentName = previous.getPluginData(NAMESPACE + ':component');
      if (componentName) componentTag(replacement,componentName);
      const parent = previous.parent;
      parent.insertChild(parent.children.indexOf(previous)+1,replacement);
      replacement.layoutPositioning = 'ABSOLUTE';
      replacement.x = previous.x;
      replacement.y = previous.y;
      geometry.push({name, previousId:previous.id, replacementId:replacement.id,
        previousChildCount:previous.children.length,replacementChildCount:replacement.children.length});
    }
    assertMapExtent(staged[0].replacement);
    phase = 'approved GPS halo and capture';
    halo.fills = [approvedHalo];
    for (const {previous,replacement} of staged) {
      previous.visible = false;
      replacement.visible = true;
    }
    const pngBase64 = await capture(root);
    const after = await status();
    const unchanged = await snapshotAnchors();
    if (!after.ok || JSON.stringify(baseline) !== JSON.stringify(unchanged) ||
        JSON.stringify(before.roots) !== JSON.stringify(after.roots)) {
      throw new Error('Existing Figma roots or captures changed during repair.');
    }
    assertMapExtent(staged[0].replacement);
    if (!closeNumber(halo.fills[0].opacity,a)) throw new Error('Figma did not resolve the approved location halo alpha.');
    root.setPluginData(REPAIR_MARK,REPAIR_VERSION);
    for (const {previous} of staged) previous.remove();
    return {before,after,tree:exportTree(root),pngBase64,fonts,
      repair:{version:REPAIR_VERSION,geometry,halo:{alphaBefore:oldPaints[0].opacity,alphaAfter:a}},
      preservation:{before:baseline,after:unchanged}};
  } catch (error) {
    for (const {previous,replacement} of staged) {
      if (!replacement.removed) replacement.remove();
      if (!previous.removed) previous.visible = true;
    }
    halo.fills = oldPaints;
    root.setPluginData(REPAIR_MARK,'');
    throw new Error(phase + ': ' + (error?.message ?? String(error)));
  }
}

figma.showUI(__html__, {width:320,height:138,title:'BugMap 메인 지도'});
figma.ui.onmessage = async ({id,command,params}) => {
  if (typeof id !== 'string' || !['bugmap_main_status','bugmap_main_build','bugmap_main_export','bugmap_main_repair'].includes(command)) return;
  if (running) {
    figma.ui.postMessage({id,error:'Another BugMap main-map command is running.'});
    return;
  }
  running = true;
  try {
    const result = command === 'bugmap_main_status' ? await status() :
      command === 'bugmap_main_build' ? await build(params) :
      command === 'bugmap_main_repair' ? await repair(params) : await exportMain(params);
    figma.ui.postMessage({id,result});
  } catch (error) {
    figma.ui.postMessage({id,error:error.message});
  } finally {
    running = false;
  }
};
