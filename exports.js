/* Downloads generated on the device; no evaluation data is sent to a server. */
const exportLoads = new Map();
function loadExportLibrary(src) {
  if (!exportLoads.has(src)) exportLoads.set(src, new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = () => { exportLoads.delete(src); script.remove(); reject(new Error('Biblioteca indisponível')); };
    document.head.append(script);
  }));
  return exportLoads.get(src);
}
function exportName(r, ext) { return 'LTCAT-' + (r?.common?.empresa || 'avaliacoes').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70) + (r?.common?.data ? '-'+r.common.data : '') + '.'+ext; }
function saveExport(data, name, type) {
  const url=URL.createObjectURL(new Blob([data],{type})); const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportBusy(buttonId, job) {
  const button=document.getElementById(buttonId), old=button?.textContent;
  if(button){button.disabled=true;button.textContent='Preparando arquivo…';}
  try { await job(); notify('Arquivo gerado. Confira os downloads do navegador.'); }
  catch(error){console.error('Exportação:',error);notify('Não foi possível gerar o arquivo. Confira a conexão e tente novamente.');}
  finally{if(button){button.disabled=false;button.textContent=old;}}
}
function sampleExportSchema(t){return t==='CO₂'?[['hora','Hora','time'],['valor','CO₂ (ppm)','number']]:t==='Vibração'?[['tarefa','Descrição da tarefa'],['tempo','Tempo (min)','number'],['ciclo','Ciclo de exposição'],['arep','AREP (m/s²)','number']]:[['numero','Número da amostra'],['inicio','Início','time'],['fim','Fim','time'],['vazaoInicial','Vazão inicial (L/min)','number'],['vazaoFinal','Vazão final (L/min)','number']];}
function exportSections(t,d){return [...(APR[t]||t==='Avaliação qualitativa'?[]:[['Equipamento e calibração',EQ]]),['Avaliação',schema(t)],['Exposição e controle',FREQ]].map(([title,fields])=>({title,fields,data:d}));}
function displayExport(value,type){if(value==null||value==='')return 'Não informado';if(type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value.split('-').reverse().join('/');return String(value);}
async function downloadPDF(r) {
  if(!r||!Object.keys(r.forms).length){notify('Inicie uma ficha para gerar o PDF.');return;}
  const snapshot=JSON.parse(JSON.stringify(r));
  await exportBusy('print',async()=>{
    await loadExportLibrary('vendor/jspdf.min.js');
    const response=await fetch('vendor/NotoSans-Regular.ttf');if(!response.ok)throw Error('Fonte indisponível');
    const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
    doc.addFileToVFS('NotoSans.ttf',btoa(binary));doc.addFont('NotoSans.ttf','NotoSans','normal');doc.setFont('NotoSans');
    doc.setProperties({title:'LTCAT Campo — '+(snapshot.common.empresa||'Avaliação'),subject:'Fichas de coleta de campo',author:snapshot.common.avaliador||'LTCAT Campo'});
    const green=[20,63,53],gray=[97,113,104];let y=0;
    function header(){doc.setFillColor(...green);doc.rect(0,0,210,28,'F');doc.setTextColor(255,255,255);doc.setFontSize(15);doc.text('LTCAT CAMPO',18,13);doc.setFontSize(8);doc.text('REGISTRO DE AVALIAÇÃO AMBIENTAL',18,21);doc.text(snapshot.status,192,13,{align:'right'});y=40;}
    function page(){doc.addPage();header();}
    function ensure(height){if(y+height>270)page();}
    function heading(text){ensure(18);doc.setTextColor(...green);doc.setFontSize(12);doc.text(text,18,y);y+=4;doc.setDrawColor(198,213,201);doc.line(18,y,192,y);y+=9;}
    function paragraph(text,size=9){doc.setFontSize(size);doc.setTextColor(45,59,51);const lines=doc.splitTextToSize(String(text),174);for(const line of lines){ensure(5);doc.text(line,18,y);y+=5;}y+=3;}
    function field(label,value,type){const text=displayExport(value,type);doc.setFontSize(9);const lines=doc.splitTextToSize(text,170);ensure(Math.min(12+lines.length*4.8,220));doc.setFontSize(8);doc.setTextColor(...gray);doc.text(label.toUpperCase(),18,y);y+=5;doc.setFontSize(9);doc.setTextColor(35,51,43);for(const line of lines){if(y>268){page();doc.setFontSize(8);doc.setTextColor(...gray);doc.text(label.toUpperCase()+' (CONTINUAÇÃO)',18,y);y+=6;doc.setFontSize(9);doc.setTextColor(35,51,43);}doc.text(line,18,y);y+=4.8;}y+=4;}
    function section(title,fields,data){const present=fields.filter(([id])=>data[id]!=null&&data[id]!=='');if(!present.length)return;heading(title);present.forEach(([id,label,type])=>field(label,data[id],type));}
    header();heading('Identificação da avaliação');paragraph(snapshot.common.empresa||'Empresa não informada',16);paragraph('Data: '+displayExport(snapshot.common.data,'date')+'   ·   '+Object.keys(snapshot.forms).length+' ficha(s) incluída(s)');section('Empresa e trabalhador',COMMON,snapshot.common);section('Ambiente de trabalho',ENV,snapshot.common);
    for(const [t,d] of Object.entries(snapshot.forms)){page();heading(t);paragraph([snapshot.common.empresa,snapshot.common.setor,snapshot.common.nome].filter(Boolean).join(' · '));for(const s of exportSections(t,d))section(s.title,s.fields,s.data);if(d.samples?.length){heading(t==='Vibração'?'Componentes de exposição':'Amostras');d.samples.forEach((sample,i)=>{ensure(18);heading('Registro '+(i+1));sampleExportSchema(t).forEach(([id,label,type])=>field(label,sample[id],type));if(t==='Agentes químicos'&&calc(sample))field('Tempo · vazão média · volume',calc(sample));});}}
    if(snapshot.photos.length){page();heading('Evidências fotográficas');for(let i=0;i<snapshot.photos.length;i++){ensure(88);const props=doc.getImageProperties(snapshot.photos[i]);const scale=Math.min(174/props.width,75/props.height);const w=props.width*scale,h=props.height*scale;doc.addImage(snapshot.photos[i],props.fileType,18,y,w,h);y+=h+5;paragraph('Foto '+(i+1),8);}}
    page();heading('Declaração e assinaturas');paragraph('Declaração '+(snapshot.consent?'confirmada pelo funcionário.':'ainda não confirmada.'));paragraph('O funcionário autoriza o uso de sua imagem apenas para ilustrar as evidências das medições ambientais no LTCAT e declara verdadeiras as informações prestadas.');
    for(const [key,label,name] of [['funcionario','Funcionário',snapshot.common.nome],['acompanhante','Acompanhante',snapshot.common.acompanhante],['avaliador','Avaliador',snapshot.common.avaliador]]){ensure(52);doc.setFontSize(10);doc.setTextColor(...green);doc.text(label,18,y);y+=5;if(snapshot.signatures[key]){doc.addImage(snapshot.signatures[key],'PNG',18,y,90,30);y+=32;}else{y+=21;doc.setDrawColor(170,180,174);doc.line(18,y,118,y);y+=7;}paragraph(name||'Nome não informado',9);}
    paragraph('Este documento reúne os registros de campo. As conclusões técnicas do LTCAT devem ser elaboradas pelo responsável.',8);
    const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);doc.setDrawColor(206,217,210);doc.line(18,279,192,279);doc.setTextColor(...gray);doc.setFontSize(7);doc.text((snapshot.common.empresa||'Avaliação').slice(0,75),18,285);doc.text('Página '+i+' de '+total,192,285,{align:'right'});}
    saveExport(doc.output('arraybuffer'),exportName(snapshot,'pdf'),'application/pdf');
  });
}
function typedExport(value,type){if(value==null||value==='')return null;if(type==='number'){const n=Number(value);return Number.isFinite(n)?n:String(value);}if(type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return new Date(value+'T12:00:00Z');if(type==='time'&&/^\d{2}:\d{2}$/.test(value)){const [h,m]=value.split(':').map(Number);return (h*60+m)/1440;}return String(value);}
async function downloadExcel(selected,buttonId='excel'){
  if(!selected.length){notify('Crie uma avaliação antes de exportar.');return;}
  const rows=JSON.parse(JSON.stringify(selected));
  await exportBusy(buttonId,async()=>{
    await loadExportLibrary('vendor/exceljs.min.js');const wb=new ExcelJS.Workbook();wb.creator='LTCAT Campo';wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
    function sheet(name,headers,widths){const ws=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});ws.columns=headers.map((h,i)=>({header:h,key:'c'+i,width:widths?.[i]||25}));ws.getRow(1).height=34;ws.getRow(1).eachCell(c=>{c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF143F35'}};c.alignment={vertical:'middle',wrapText:true};});return ws;}
    function add(ws,values){const row=ws.addRow(values);row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>{c.font={name:'Calibri',size:11};if(c.value instanceof Date)c.numFmt='dd/mm/yyyy';if(row.number%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5F0'}};});const longest=Math.max(1,...values.map(v=>typeof v==='string'?Math.ceil(v.length/65):1));row.height=Math.min(180,Math.max(30,longest*15));return row;}
    const base=sheet('Avaliações',['ID','Situação',...COMMON.map(x=>x[1]),...ENV.map(x=>x[1]),'Declaração confirmada','Fichas incluídas','Fotos','Assinaturas'],[38,18,...COMMON.map(()=>25),...ENV.map(()=>28),24,45,12,30]);
    const answers=sheet('Respostas',['ID da avaliação','Empresa','Setor','Funcionário','Ficha','Seção','Campo','Valor'],[38,30,25,28,25,28,48,80]);
    const chemical=sheet('Amostras químicas',['ID da avaliação','Empresa','Ficha','Nº amostra','Tipo','Início','Fim','Vazão inicial (L/min)','Vazão final (L/min)','Tempo (min)','Vazão média (L/min)','Volume (L)'],[38,30,24,20,16,14,14,25,25,20,25,20]);
    const co2=sheet('Amostras CO2',['ID da avaliação','Empresa','Registro','Hora','CO₂ (ppm)'],[38,30,16,16,20]);
    const vibration=sheet('Vibração',['ID da avaliação','Empresa','Componente','Descrição da tarefa','Tempo (min)','Ciclo de exposição','AREP (m/s²)'],[38,30,18,65,20,30,22]);
    const evidence=sheet('Evidências',['ID da avaliação','Empresa','Tipo','Descrição','Imagem'],[38,30,22,35,44]);
    for(const r of rows){add(base,[r.id,r.status,...COMMON.map(([id,,type])=>typedExport(r.common[id],type)),...ENV.map(([id,,type])=>typedExport(r.common[id],type)),r.consent?'Sim':'Não',Object.keys(r.forms).join(', '),r.photos.length,Object.keys(r.signatures).join(', ')]);for(const [t,d] of Object.entries(r.forms)){for(const s of exportSections(t,d)){for(const [id,label,type] of s.fields){if(d[id]==null||d[id]==='')continue;const row=add(answers,[r.id,r.common.empresa,r.common.setor,r.common.nome,t,s.title,label,typedExport(d[id],type)]);if(type==='time')row.getCell(8).numFmt='hh:mm';}}for(const [i,s] of (d.samples||[]).entries()){if(t==='Agentes químicos'){const row=add(chemical,[r.id,r.common.empresa,t,s.numero||String(i+1),d.amostraTipo,typedExport(s.inicio,'time'),typedExport(s.fim,'time'),typedExport(s.vazaoInicial,'number'),typedExport(s.vazaoFinal,'number')]);const n=row.number;row.getCell(6).numFmt=row.getCell(7).numFmt='hh:mm';const start=typedExport(s.inicio,'time'),end=typedExport(s.fim,'time'),vi=typedExport(s.vazaoInicial,'number'),vf=typedExport(s.vazaoFinal,'number');if(typeof start==='number'&&typeof end==='number')row.getCell(10).value={formula:`MOD(G${n}-F${n},1)*1440`,result:((end-start+1)%1)*1440};if(typeof vi==='number'&&typeof vf==='number')row.getCell(11).value={formula:`AVERAGE(H${n}:I${n})`,result:(vi+vf)/2};if(typeof start==='number'&&typeof end==='number'&&typeof vi==='number'&&typeof vf==='number')row.getCell(12).value={formula:`J${n}*K${n}`,result:((end-start+1)%1)*1440*(vi+vf)/2};for(let c=8;c<=12;c++)row.getCell(c).numFmt='0.000';}else if(t==='CO₂'){const row=add(co2,[r.id,r.common.empresa,i+1,typedExport(s.hora,'time'),typedExport(s.valor,'number')]);row.getCell(4).numFmt='hh:mm';row.getCell(5).numFmt='0.000';}else if(t==='Vibração'){add(vibration,[r.id,r.common.empresa,i+1,s.tarefa,typedExport(s.tempo,'number'),s.ciclo,typedExport(s.arep,'number')]);}}}
      const images=[...r.photos.map((img,i)=>({img,type:'Foto',label:'Foto '+(i+1)})),...Object.entries(r.signatures).map(([key,img])=>({img,type:'Assinatura',label:({funcionario:'Funcionário',acompanhante:'Acompanhante',avaliador:'Avaliador'})[key]||key}))];for(const item of images){const row=add(evidence,[r.id,r.common.empresa,item.type,item.label,'']);row.height=130;const imageId=wb.addImage({base64:item.img,extension:item.img.startsWith('data:image/png')?'png':'jpeg'});const im=new Image();im.src=item.img;await im.decode();const ratio=Math.min(280/im.width,150/im.height);evidence.addImage(imageId,{tl:{col:4.1,row:row.number-0.9},ext:{width:im.width*ratio,height:im.height*ratio},editAs:'oneCell'});}}
    for(let row=2;row<=base.rowCount;row++)base.getCell(row,8).numFmt='hh:mm';
    for(const ws of wb.worksheets){ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:ws.columnCount}};ws.pageSetup.printTitlesRow='1:1';}
    const buffer=await wb.xlsx.writeBuffer();saveExport(buffer,rows.length===1?exportName(rows[0],'xlsx'):'LTCAT-avaliacoes.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
}
document.getElementById('excelAll').onclick=()=>downloadExcel(records,'excelAll');
