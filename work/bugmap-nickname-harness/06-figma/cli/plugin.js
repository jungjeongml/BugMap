const bugMapNicknameCommand = (() => {
  const plan = NICKNAME_PLAN;
  const { target, colors, typography, strings, blocks } = plan;
  const tag = 'bugmap.nickname.v1';
  const data = (node, name, value) => node.setPluginData(tag+':'+name, value);
  const get = (node, name) => node.getPluginData(tag+':'+name);
  const copy = value => JSON.parse(JSON.stringify(value));
  const info = node => ({id:node.id,type:node.type,name:node.name,x:node.x,y:node.y,width:node.width,height:node.height});
  const box = (x,y,width,height) => ({x,y,width,height});
  const stable = value => JSON.stringify(value);
  const route = (destinationId) => ({trigger:{type:'ON_CLICK'},actions:[{
    type:'NODE',destinationId,navigation:'NAVIGATE',transition:null
  }]});
  function tree(node, tracked = false) {
    const out={...info(node),fills:Array.isArray(node.fills)?copy(node.fills):[]};
    for (const name of ['opacity','rotation','visible','layoutMode','layoutPositioning','cornerRadius',
      'topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius','strokeWeight','strokeAlign','clipsContent',
      'overflowDirection','primaryAxisSizingMode','counterAxisSizingMode','layoutSizingHorizontal','layoutSizingVertical',
      'itemSpacing','paddingLeft','paddingRight','paddingTop','paddingBottom','primaryAxisAlignItems','counterAxisAlignItems',
      'textAutoResize','textAlignVertical','textAlignHorizontal']) {
      if (['number','boolean','string'].includes(typeof node[name])) out[name]=node[name];
    }
    for (const name of ['strokes','effects','reactions','vectorPaths']) if(Array.isArray(node[name])) out[name]=copy(node[name]);
    if (node.type==='TEXT') {
      out.characters=node.characters;
      if(typeof node.fontSize==='number')out.fontSize=node.fontSize;
      if(typeof node.fontName==='object')out.fontName=copy(node.fontName);
      if(typeof node.lineHeight==='object')out.lineHeight=copy(node.lineHeight);
    }
    if (tracked) {
      const semantic = get(node,'semantic');
      const componentName = get(node,'component');
      if (semantic) out.semanticId=semantic;
      if (componentName) out.componentName=componentName;
      if (get(node,'interactive')==='true') out.interactive=true;
      if (node.boundVariables && Object.keys(node.boundVariables).length) out.boundVariables=copy(node.boundVariables);
    }
    if ('children' in node) out.children=node.children.map(child=>tree(child,tracked));
    return out;
  }
  // Content fingerprint detects changes to the complete preserved tree on the two target anchor frames.
  function fingerprint(value) {
    const str=stable(value);let low=0x811c9dc5,high=0x9e3779b1;
    for(let i=0; i<str.length; i++) {
      const n=str.charCodeAt(i);
      low=Math.imul(low^n,0x01000193); high=Math.imul(high^n,0x85ebca6b);
    }
    return [str.length,(low>>>0).toString(16),(high>>>0).toString(16)].join(':');
  }
  const png = async node => figma.base64Encode(await node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}}));
  async function context(params) {
    const page=figma.currentPage, fileKey=figma.fileKey??null;
    if(params?.fileKey!==target.fileKey || params?.digest!==plan.digest || (fileKey&&fileKey!==target.fileKey) ||
      figma.root.name!==target.documentName || page.id!==target.pageId || page.name!==target.pageName)
      throw Error('Approved file, page or plan mismatch: '+JSON.stringify({paramFile:params?.fileKey,paramDigest:params?.digest,fileKey,root:figma.root.name,pageId:page.id,pageName:page.name,expectedDigest:plan.digest}));
    await page.loadAsync();
    const login=await figma.getNodeByIdAsync(target.baselineLogin);
    const map=await figma.getNodeByIdAsync(target.successDestination);
    for(const [node,name] of [[login,'05 · 첫 로그인 / 지도 배경'],[map,'07 · 메인 / 발견 지도']])
      if(node?.name!==name||node.type!=='FRAME'||node.parent?.id!==page.id||node.width!==390||node.height!==844)
        throw Error('Anchor mismatch: '+name);
    return {page,fileKey,login,map};
  }
  const authored = ctx => ctx.page.children.filter(n=>get(n,'plan')===plan.digest);
  const points = page => Array.isArray(page.flowStartingPoints)?copy(page.flowStartingPoints):[];
  function existing(ctx) {
    const original=ctx.page.children.filter(n=>!authored(ctx).includes(n));
    return {
      roots:original.map(info),
      trees:original.map(n=>({id:n.id,fingerprint:fingerprint(tree(n))})),
      flowStartingPoints:points(ctx.page).filter(p=>original.some(n=>n.id===p.nodeId))
    };
  }
  async function preservation(ctx) {
    return {...existing(ctx),png:{login:await png(ctx.login),map:await png(ctx.map)}};
  }
  function status(ctx) {
    return {fileKey:ctx.fileKey,documentName:figma.root.name,pageId:ctx.page.id,pageName:ctx.page.name,
      planDigest:plan.digest,anchors:[info(ctx.login),info(ctx.map)],roots:ctx.page.children.map(info),
      authored:authored(ctx).map(info),flowStartingPoints:points(ctx.page)};
  }
  const rgb = hex => {
    if(!/^#[a-fA-F0-9]{6}$/.test(hex)) throw Error('Unsupported approved color: '+hex);
    const [r,g,b]=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255);
    return {r,g,b};
  };
  async function fonts() {
    const installed=(await figma.listAvailableFontsAsync()).map(x=>x.fontName);
    for(const family of ['Pretendard','Noto Sans KR','Apple SD Gothic Neo']) {
      const medium=installed.find(n=>n.family===family&&n.style==='Medium');
      const bold=installed.find(n=>n.family===family&&n.style==='Bold');
      if(!medium||!bold)continue;
      try {
        await Promise.all([figma.loadFontAsync(medium),figma.loadFontAsync(bold)]);
        return {500:medium,700:bold};
      } catch (error) { console.warn('Could not load '+family+': '+error.message); }
    }
    throw Error('No supported Korean font');
  }
  async function build(ctx) {
    if(authored(ctx).length || ctx.page.children.some(n=>plan.states.some(s=>s.name===n.name)||n.name===plan.section))
      throw Error('Already built or colliding frame names');
    const before=await preservation(ctx);
    const allPoints=points(ctx.page), loadedFonts=await fonts();
    const available=await figma.variables.getLocalVariablesAsync('COLOR');
    const found=new Map(), tracked=[];
    const track = node => (tracked.push(node),node);
    let collection, checkpoint='tokens';
    function paint(token) {
      const color=rgb(colors[token]);
      if(!found.has(token)) {
        const targetVar=available.find(v=>v.name.split('/').at(-1)===token&&Object.values(v.valuesByMode).every(m=>
          ['r','g','b'].every(k=>Math.abs(m[k]-color[k])<0.00001)&&(m.a??1)===1));
        if(targetVar) found.set(token,targetVar);
        else {
          collection ??= figma.variables.createVariableCollection('BugMap · 닉네임 10');
          const variable=figma.variables.createVariable(token,collection,'COLOR');
          variable.setValueForMode(collection.defaultModeId,{...color,a:1});
          found.set(token,variable);
        }
      }
      return figma.variables.setBoundVariableForPaint({type:'SOLID',color,opacity:1},'color',found.get(token));
    }
    function bindVectorPaints(node) {
      for(const field of ['fills','strokes']) {
        if(!Array.isArray(node[field])||!node[field].length)continue;
        node[field]=node[field].filter(p=>p.type!=='SOLID'||p.opacity!==0).map(p=>{
          if(p.type!=='SOLID')return p;
          const name=Object.keys(colors).find(k=>{
            const c=rgb(colors[k]);
            return ['r','g','b'].every(ch=>Math.round(c[ch]*255)===Math.round(p.color[ch]*255));
          });
          if(!name)throw Error('SVG color outside approved palette: '+JSON.stringify(p.color));
          return {...p,boundVariables:paint(name).boundVariables};
        });
      }
      if('children' in node)node.children.forEach(bindVectorPaints);
    }
    function attach(parent,node,x,y) {
      if(parent) {
        parent.appendChild(node);
        if(parent.layoutMode&&parent.layoutMode!=='NONE')node.layoutPositioning='ABSOLUTE';
      }
      node.x=x;node.y=y;
      return node;
    }
    function frame(parent,name,b,isComponent=false) {
      const node=track(isComponent?figma.createComponent():figma.createFrame());
      node.name=name;node.layoutMode='VERTICAL';node.primaryAxisSizingMode='FIXED';
      node.counterAxisSizingMode='FIXED';node.resize(b.width,b.height);node.fills=[];node.clipsContent=false;
      return attach(parent,node,b.x,b.y);
    }
    function surface(node,fill,radius,border,weight=1) {
      node.fills=fill?[paint(fill)]:[];node.cornerRadius=radius;
      if(border){node.strokes=[paint(border)];node.strokeAlign='INSIDE';node.strokeWeight=weight;}
      return node;
    }
    function rect(parent,name,b,fill,radius=0) {
      const node=track(figma.createRectangle());node.name=name;node.resize(b.width,b.height);
      surface(node,fill,radius);
      return attach(parent,node,b.x,b.y);
    }
    function text(parent,name,value,style,b,token,align='LEFT') {
      const spec=typography[style], node=track(figma.createText());
      node.name=name;node.fontName=loadedFonts[spec.fontWeight];node.fontSize=spec.fontSize;
      node.lineHeight={unit:'PIXELS',value:spec.lineHeight};
      if(style==='title')node.letterSpacing={unit:'PIXELS',value:-0.55};
      node.characters=value;node.textAutoResize='NONE';node.resize(b.width,b.height);
      node.textAlignVertical='CENTER';node.textAlignHorizontal=align;node.fills=[paint(token)];
      return attach(parent,node,b.x,b.y);
    }
    function svg(parent,name,payload,x,y) {
      const imported=track(figma.createNodeFromSvg(payload));
      try {
        if(!imported.children.length)throw Error('Empty vector import: '+name);
        const group=track(figma.group([...imported.children],imported));group.name=name;
        attach(parent,group,x+group.x,y+group.y);
        bindVectorPaints(group);
        return group;
      } finally { imported.remove(); }
    }
    function semantic(node,name,component=null,interactive=false) {
      data(node,'semantic',name);if(component)data(node,'component',component);
      if(interactive)data(node,'interactive','true');
      return node;
    }
    function buildStatus(node) {
      text(node,'시스템 시간','9:41','system',box(11,0,52,32),'text');
      svg(node,'신호 · 배터리 벡터',plan.svg.status,286,8);
    }
    function buildBrand(node) {
      surface(node,'brandSurface',18,'brandBorder');node.clipsContent=true;
      svg(node,'지형선과 관찰 표식 · Lucide Bug',plan.svg.topography,104,1);
      svg(node,'BugMap 공식 워드마크',plan.svg.logo,18,32.035);
    }
    function buildKeyboard(node) {
      surface(node,'keyboardBase',22,'keyboardRim');
      node.topLeftRadius=22;node.topRightRadius=22;node.bottomLeftRadius=0;node.bottomRightRadius=0;
      node.strokeBottomWeight=0;node.clipsContent=true;
      const rows=[
        ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
        ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
        ['⇧','ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ','⌫'],
        ['123','한/영','스페이스','완료']
      ];
      const weight = value => ['⇧','⌫','123','한/영'].includes(value)?1.35:value==='스페이스'?4:value==='완료'?1.8:1;
      const secondary = value => ['⇧','⌫','123','한/영','완료'].includes(value);
      rows.forEach((values,index)=>{
        const inset=[0,15,2,0][index], width=372-2*inset;
        const scale=(width-(values.length-1)*5)/values.reduce((sum,key)=>sum+weight(key),0);
        const row=frame(node,'시스템 키 행 '+(index+1),box(9+inset,16+index*52,width,44));
        row.layoutMode='HORIZONTAL';row.itemSpacing=5;
        for(const value of values) {
          const dark=secondary(value);
          const key=frame(null,'키 · '+value,box(0,0,scale*weight(value),44));
          row.appendChild(key);
          key.layoutSizingHorizontal='FIXED';key.layoutSizingVertical='FIXED';
          surface(key,dark?'keyboardAlt':'keyboardKey',8);
          text(key,'키 표시',value,dark?'keyAction':'key',box(0,0,key.width,44),'text','CENTER');
        }
      });
      text(node,'입력 언어','한국어','keyAction',box(19,216,88,60),'keyboardSecondary');
      rect(node,'홈 인디케이터',box(128,290,134,4),'keyboardSecondary',2);
    }
    function buildButton(node,enabled) {
      surface(node,enabled?'accent':'disabledSurface',24,enabled?null:'disabledBorder');
      text(node,'시작하기 버튼 레이블',strings.start,'button',box(0,0,node.width,node.height),
        enabled?'onAccent':'disabledText','CENTER');
    }
    function buildField(node,state) {
      const isInitial=state==='initial', isInvalid=state==='invalid';
      surface(node,'field',16,isInitial?'accent':isInvalid?'error':'fieldBorder',isInitial||isInvalid?2:1);
      const inset=isInitial?19:16;
      text(node,'닉네임 값',isInitial?strings.placeholder:isInvalid?strings.invalidValue:strings.validValue,'fieldValue',
        box(inset,0,node.width-inset-16,node.height),isInitial?'textPlaceholder':'text');
      if(isInitial)rect(node,'입력 커서',box(13,15,2,21),'accent',1);
    }
    try {
      checkpoint='component section';
      const far=ctx.page.children.reduce((max,n)=>Math.max(max,n.x+n.width),0);
      const x=Math.ceil((far+140)/20)*20, y=ctx.login.y;
      const section=track(figma.createSection());
      section.name=plan.section;section.resizeWithoutConstraints(1490,580);
      section.x=x;section.y=y+920;data(section,'plan',plan.digest);
      const masters=new Map();
      function component(id,name,b,author,token) {
        const node=frame(section,name,b,true);
        if(token)semantic(node,id,token);
        author(node);masters.set(id,node);
      }
      component('status','시스템 상태 · 시연',box(24,36,366,32),buildStatus);
      component('brand','BugMap 닉네임 · 브랜드',box(420,36,350,96),buildBrand);
      component('keyboard','시스템 한글 키보드 · 시연',box(24,168,390,304),buildKeyboard,'keyboardPreview');
      component('initial','닉네임 입력 · 첫 입력',box(420,168,350,52),node=>buildField(node,'initial'),'nicknameField');
      component('ready','닉네임 입력 · 유효',box(420,240,350,52),node=>buildField(node,'ready'),'nicknameField');
      component('invalid','닉네임 입력 · 오류',box(420,312,350,52),node=>buildField(node,'invalid'),'nicknameField');
      component('disabled','닉네임 시작하기 · 비활성',box(798,168,350,48),node=>buildButton(node,false),'startButton');
      component('enabled','닉네임 시작하기 · 활성',box(798,240,350,48),node=>buildButton(node,true),'startButton');
      function instance(parent,key,name,b) {
        const node=track(masters.get(key).createInstance());node.name=name;
        return attach(parent,node,b.x,b.y);
      }
      const roots=[], buttons=[];
      for(const [index,state] of plan.states.entries()) {
        checkpoint='frame '+state.id;
        const node=frame(null,state.name,box(x+index*430,y,390,844));
        data(node,'plan',plan.digest);data(node,'state',state.id);
        semantic(node,'nickname-setup','screen');
        node.fills=[paint('background')];node.clipsContent=true;
        roots.push(node);
        semantic(instance(node,'status','상태 바 · 시연',blocks['status-bar']),'status-bar');
        semantic(instance(node,'brand','BugMap 브랜드 그리드',blocks['brand-visual']),'brand-visual');
        semantic(text(node,'화면 제목',strings.title,'title',blocks.title,'text'),'title');
        semantic(text(node,'공개 작성자 이름 안내',strings.description,'description',blocks.description,'textSecondary'),'description');
        semantic(text(node,'입력 레이블',strings.fieldLabel,'fieldLabel',blocks['field-label'],'text'),'field-label');
        semantic(instance(node,state.id,'닉네임 입력란',blocks.nickname),'nickname','nicknameField',true);
        const invalid=state.id==='invalid', ready=state.id==='ready';
        semantic(text(node,invalid?'길이 오류 안내':'닉네임 길이 도움말',
          invalid?strings.tooShort:strings.guidance,'helper',blocks.helper,invalid?'error':'textPlaceholder'),'helper','fieldMessage');
        const button=semantic(instance(node,ready?'enabled':'disabled','시작하기 · '+(ready?'활성':'비활성'),blocks.start),
          'start','startButton',ready);
        buttons.push(button);
        semantic(instance(node,'keyboard','한글 시스템 키보드 · 시연',blocks.keyboard),'keyboard','keyboardPreview');
      }
      checkpoint='prototype';
      const ready=buttons[plan.states.findIndex(s=>s.id==='ready')];
      if(typeof ready.setReactionsAsync!=='function')throw Error('Design API cannot set prototype reaction');
      await ready.setReactionsAsync([route(ctx.map.id)]);
      ctx.page.flowStartingPoints=[...allPoints,...roots.map((n,i)=>({nodeId:n.id,name:plan.states[i].flow}))];
      if(!roots.every(n=>points(ctx.page).some(p=>p.nodeId===n.id))) throw Error('New flow starting points not persisted');
      checkpoint='preservation';
      const after=await preservation(ctx);
      if(stable(before)!==stable(after))throw Error('Original frames, prototype anchors, or baseline PNG changed');
      for(const [index,button] of buttons.entries()) {
        const readback=button.reactions;
        if(plan.states[index].id==='ready') {
          if(readback.length!==1||readback[0].trigger.type!=='ON_CLICK'||readback[0].actions[0].destinationId!==ctx.map.id)
            throw Error('Ready prototype route readback mismatch');
        } else if(readback.length)throw Error('Disabled button has reaction');
      }
      ctx.page.selection=roots;
      figma.viewport.scrollAndZoomIntoView(roots);
      return {...status(ctx),fonts:loadedFonts,components:[...masters.values()].map(info),
        collection:collection?.id??null,section:info(section),original:after};
    } catch(error) {
      for(const node of tracked.reverse()) if(!node.removed) {try{node.remove();}catch{}}
      if(collection){try{collection.remove();}catch{}}
      try{ctx.page.flowStartingPoints=allPoints;}catch{}
      throw Error('Nickname '+checkpoint+': '+error.message);
    }
  }
  async function exported(ctx) {
    const roots=plan.states.map(s=>authored(ctx).find(n=>get(n,'state')===s.id));
    if(roots.some(n=>!n))throw Error('Missing nickname root');
    const section=authored(ctx).find(n=>n.type==='SECTION'&&n.name===plan.section);
    return {...status(ctx),exportedAt:new Date().toISOString(),original:await preservation(ctx),
      components:section?.children.map(n=>tree(n,true))??[],
      screens:await Promise.all(roots.map(async(n,index)=>({state:plan.states[index].id,node:tree(n,true),
        image:await png(n)})))};
  }
  return async (mode,params) => {
    const ctx=await context(params);
    if(mode==='status')return status(ctx);
    if(mode==='baseline')return {...status(ctx),original:await preservation(ctx)};
    if(mode==='build')return await build(ctx);
    if(mode==='export')return await exported(ctx);
    throw Error('Unknown nickname mode');
  };
})();
