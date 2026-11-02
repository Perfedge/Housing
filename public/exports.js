'use strict';
const RESULTS=[['Total homes','units','homes'],['Affordable homes','affordable','homes'],['Market-rate homes','marketUnits','homes'],['Construction and development','construction','USD'],['Land acquisition','landCost','USD'],['Total development cost','totalCost','USD'],['Market-rate revenue','marketRevenue','USD'],['Affordable housing revenue','affordableRevenue','USD'],['Public subsidy','publicSubsidy','USD'],['Funding gap (negative = surplus)','gap','USD'],['Share of hypothetical 1,600-home benchmark','goalPct','%'],['Illustrative density capacity','maxDensity','homes/acre']];
const LIMITATIONS='All project inputs, revenue, subsidy, capacity rules, and challenge thresholds are illustrative. The 1,600-home benchmark is hypothetical, not an adopted City requirement. Affordable revenue is fixed at $250,000 per affordable home. Height does not change home count or cost. No parcel, zoning, infrastructure, displacement, financing, developer return, annual rental cash flows, or current City requirements are modeled.';
const libraryLoads=new Map();
async function loadLibrary(name,globalName){if(window[globalName])return window[globalName];if(!libraryLoads.has(name))libraryLoads.set(name,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/'+name;script.onload=()=>window[globalName]?resolve(window[globalName]):reject(Error('Export library did not initialize.'));script.onerror=()=>{libraryLoads.delete(name);script.remove();reject(Error('Download tools could not load. Check your connection and try again.'))};document.head.append(script)}));return libraryLoads.get(name);}
function signedMoney(n){return(n<0?'-':'')+usd(n);}
function resultText(value,unit){return unit==='USD'?signedMoney(value):unit==='%'?value.toFixed(1)+'%':fmt(value)+' '+unit;}
// One scenario snapshot supplies the same financial graphic to both download formats.
function financialGraphic(inputs){
 const r=calculate(inputs),canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1500;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('The financial graphic could not be generated.');ctx.scale(2,2);
 const color={ink:'#173f3a',muted:'#52665f',line:'#dce7e1',market:'#769abb',affordable:'#3c9085',subsidy:'#d6a044'};
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1000,750);
 function label(text,x,y,size=20,fill=color.ink,align='left',bold=false){ctx.fillStyle=fill;ctx.font=(bold?'600 ':'')+size+'px Arial, sans-serif';ctx.textAlign=align;ctx.fillText(text,x,y)}
 label('Can the plan pay for itself?',38,53,30,color.ink,'left',true);
 label('Illustrative one-time project costs and funding',38,85,17,color.muted);
 const rows=[['Construction and development',r.construction],['Land acquisition',r.landCost],['Total development cost',r.totalCost],['Market-rate revenue',r.marketRevenue],['Affordable housing revenue',r.affordableRevenue],['Public subsidy',r.publicSubsidy],[r.gap>=0?'Estimated funding gap':'Estimated surplus',Math.abs(r.gap)]];
 rows.forEach(([name,value],i)=>{const y=126+i*39;const bold=i===2||i===6;label(name,38,y,20,color.ink,'left',bold);label(usd(value),962,y,20,i===6&&r.gap>0?'#ae402f':color.ink,'right',bold);ctx.fillStyle=color.line;ctx.fillRect(38,y+11,924,1)});
 label('Sources relative to total cost',38,425,23,color.ink,'left',true);
 const sources=r.marketRevenue+r.affordableRevenue+r.publicSubsidy,scale=Math.max(1,r.totalCost,sources),barX=230,barWidth=732;
 label('Total cost',38,467,18);ctx.fillStyle='#e5ece8';ctx.fillRect(barX,449,barWidth,26);ctx.fillStyle=color.ink;ctx.fillRect(barX,449,barWidth*r.totalCost/scale,26);
 label('Funding sources',38,513,18);ctx.fillStyle='#e5ece8';ctx.fillRect(barX,495,barWidth,26);let x=barX;
 for(const [value,fill]of [[r.marketRevenue,color.market],[r.affordableRevenue,color.affordable],[r.publicSubsidy,color.subsidy]]){const w=barWidth*value/scale;ctx.fillStyle=fill;ctx.fillRect(x,495,w,26);x+=w}
 ctx.strokeStyle=color.ink;ctx.lineWidth=2;const costX=barX+barWidth*r.totalCost/scale;ctx.beginPath();ctx.moveTo(costX,489);ctx.lineTo(costX,527);ctx.stroke();
 for(const [name,fill,x]of [['Market revenue',color.market,38],['Affordable revenue',color.affordable,320],['Subsidy',color.subsidy,646]]){ctx.fillStyle=fill;ctx.fillRect(x,552,16,16);label(name,x+25,566,17,color.muted)}
 label('Both bars use the same dollar scale. The vertical marker shows total cost.',38,610,17,color.muted);
 label(r.gap>0?'A gap means modeled costs exceed revenue and public subsidy.':'A surplus means modeled revenue and public subsidy exceed costs.',38,646,18,r.gap>0?'#ae402f':color.ink);
 label('A modeled balance does not establish real project feasibility.',38,678,17,color.muted);
 label('Housing student lab | All financial inputs and outcomes are illustrative.',38,721,15,color.muted);
 return canvas.toDataURL('image/png');
}
async function makePdf(doc){
 const {jsPDF}=await loadLibrary('jspdf.umd.min.js','jspdf');const pdf=new jsPDF({unit:'mm',format:'a4'});let y=31,page=1;const width=174;
 const fontResponse=await fetch('fonts/NotoSans-Regular.ttf');if(!fontResponse.ok)throw Error('PDF font could not load. Please try again.');const fontBytes=new Uint8Array(await fontResponse.arrayBuffer());let fontBinary='';for(let i=0;i<fontBytes.length;i+=8192)fontBinary+=String.fromCharCode(...fontBytes.subarray(i,i+8192));pdf.addFileToVFS('NotoSans-Regular.ttf',btoa(fontBinary));pdf.addFont('NotoSans-Regular.ttf','NotoSans','normal');pdf.setFont('NotoSans');
 function header(){pdf.setFillColor(23,63,58);pdf.rect(0,0,210,11,'F');pdf.setTextColor(23,63,58);pdf.setFontSize(9);pdf.text('HOUSING / HEALDSBURG 2040',18,19)}
 function fresh(){pdf.addPage();page++;header();y=29}
 function space(h){if(y+h>277)fresh()}
 function text(value,size=10,color=[45,65,59]){pdf.setFontSize(size);pdf.setTextColor(...color);const lines=pdf.splitTextToSize(String(value),width);for(const line of lines){space(5.5);pdf.text(line,18,y);y+=5.5}y+=2}
 function heading(value){space(13);y+=5;text(value,12,[23,63,58])}
 function row(label,value){pdf.setFontSize(9);const lines=pdf.splitTextToSize(label,112);const h=Math.max(6.5,lines.length*4.5+3);space(h);pdf.setTextColor(60,75,67);pdf.text(lines,18,y);pdf.setTextColor(23,63,58);pdf.text(String(value),192,y,{align:'right'});y+=h;pdf.setDrawColor(225,230,219);pdf.line(18,y-3,192,y-3)}
 header();text('Student planning brief',22,[23,63,58]);text(doc.name,13);text('Prepared '+new Date().toLocaleDateString('en-US')+' | Illustrative classroom scenario',9);
 heading('Your housing choices');for(const c of CONFIG)row(c.label,c.money?usd(doc.inputs[c.key]):doc.inputs[c.key]+c.unit);
 heading('Scenario results');const r=calculate(doc.inputs);for(const [label,key,unit]of RESULTS)row(label,resultText(r[key],unit));
 space(132);pdf.addImage(financialGraphic(doc.inputs),'PNG',24,y,162,121.5);y+=129;
 if(doc.baseline){heading('Compared with pinned baseline');const b=calculate(doc.baseline);for(const [label,key,unit]of RESULTS.slice(0,3).concat(RESULTS.slice(8,10)))row(label,resultText(b[key],unit)+' -> '+resultText(r[key],unit));}
 heading('Your recommendation');text(doc.reflection||'No reflection entered.');heading('Assumptions and limitations');text(LIMITATIONS,9);text('Source: Housing student lab model. These are modeled outcomes, not forecasts or project feasibility findings.',9);
 for(let i=1;i<=page;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(90,105,95);pdf.text('Housing | Student planning lab',18,289);pdf.text(i+' / '+page,192,289,{align:'right'})}
 return pdf;
}
async function makeWorkbook(doc,plans){
 const ExcelJS=await loadLibrary('exceljs.min.js','ExcelJS');const wb=new ExcelJS.Workbook();wb.creator='Housing student planning lab';wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
 const money='"$"#,##0;[Red]("$"#,##0)';
 function sheetFor(name,plan){const sh=wb.addWorksheet(name);sh.columns=[{width:55},{width:28}];sh.views=[{state:'frozen',ySplit:7}];sh.mergeCells('A1:B1');sh.getCell('A1').value='HOUSING | HEALDSBURG 2040';sh.getCell('A1').font={name:'Calibri',size:18,bold:true,color:{argb:'FF173F3A'}};sh.getRow(1).height=32;sh.mergeCells('A2:B2');sh.getCell('A2').value=plan.name;sh.getCell('A2').font={bold:true,size:13};sh.getRow(2).height=25;sh.mergeCells('A3:B4');sh.getCell('A3').value='Illustrative classroom model. Edit the numeric inputs to explore results in Excel. Amounts are one-time USD. Negative funding gap means a surplus.';sh.getCell('A3').alignment={wrapText:true,vertical:'top'};sh.getRow(3).height=25;sh.getCell('A6').value='INPUTS';sh.getCell('B6').value='Value';sh.getRow(6).font={bold:true,color:{argb:'FFFFFFFF'}};sh.getRow(6).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF173F3A'}};
 CONFIG.forEach((c,i)=>{const row=8+i;sh.getCell('A'+row).value=c.label+(c.unit&&c.unit!=='%'?' ('+c.unit.trim()+')':'');sh.getCell('B'+row).value=c.key==='aff'?plan.inputs[c.key]/100:plan.inputs[c.key];sh.getCell('B'+row).numFmt=c.money?money:c.key==='aff'?'0%':'#,##0';sh.getCell('B'+row).font={color:{argb:'FF087A69'}}});
 sh.getCell('A16').value='Affordable revenue per home (fixed model assumption)';sh.getCell('B16').value=250000;sh.getCell('B16').numFmt=money;sh.getCell('A17').value='Hypothetical housing benchmark (homes)';sh.getCell('B17').value=1600;
 sh.getCell('A19').value='RESULTS';sh.getCell('B19').value='Calculated value';sh.getRow(19).font={bold:true,color:{argb:'FFFFFFFF'}};sh.getRow(19).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF173F3A'}};
 const formulas=['FLOOR(B8*B13,1)','ROUND(B20*B10,0)','B20-B21','B20*B11','B13*B14','SUM(B23:B24)','B22*B15','B21*B16','B21*B12','B25-B26-B27-B28','B20/B17','B9*24'];const r=calculate(plan.inputs);
 RESULTS.forEach(([label,key,unit],i)=>{const row=20+i;sh.getCell('A'+row).value=label;sh.getCell('B'+row).value={formula:formulas[i],result:key==='goalPct'?r[key]/100:r[key]};sh.getCell('B'+row).numFmt=unit==='USD'?money:unit==='%'?'0.0%':'#,##0';if(i===9)sh.getRow(row).font={bold:true}});
 sh.getCell('A33').value='ILLUSTRATIVE CAPACITY CHECK';sh.getCell('B33').value={formula:'IF(B8>B31,"Target exceeds rough capacity","Within rough capacity")',result:plan.inputs.density>r.maxDensity?'Target exceeds rough capacity':'Within rough capacity'};sh.getCell('B33').alignment={wrapText:true};sh.getRow(33).height=32;
 sh.mergeCells('A35:B35');sh.getCell('A35').value='STUDENT RECOMMENDATION';sh.getCell('A35').font={bold:true};
 let noteRow=36;const reflection=plan.reflection||'No reflection entered.';for(let offset=0;offset<reflection.length;offset+=750){const chunk=reflection.slice(offset,offset+750);sh.mergeCells('A'+noteRow+':B'+noteRow);sh.getCell('A'+noteRow).value=chunk;sh.getCell('A'+noteRow).alignment={wrapText:true,vertical:'top'};sh.getRow(noteRow).height=Math.min(409,24+Math.max(chunk.split('\n').length,Math.ceil(chunk.length/85))*16);noteRow++}
 noteRow+=2;sh.mergeCells('A'+noteRow+':B'+noteRow);sh.getCell('A'+noteRow).value='MODEL SOURCE AND LIMITATIONS';sh.getCell('A'+noteRow).font={bold:true};noteRow++;sh.mergeCells('A'+noteRow+':B'+noteRow);sh.getCell('A'+noteRow).value='Source: Housing student lab model. '+LIMITATIONS;sh.getCell('A'+noteRow).alignment={wrapText:true,vertical:'top'};sh.getRow(noteRow).height=130;
 sh.eachRow(row=>row.eachCell(cell=>{cell.font={name:'Calibri',size:11,...cell.font};if(!cell.alignment)cell.alignment={vertical:'middle'}}));sh.pageSetup={paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0};return sh;}
 sheetFor('Current plan',doc);if(doc.baseline)sheetFor('Pinned baseline',{name:'Pinned baseline',inputs:doc.baseline,reflection:''});
 const graphicSheet=wb.addWorksheet('Financial graphic');graphicSheet.columns=Array.from({length:10},()=>({width:14}));
 const graphicId=wb.addImage({base64:financialGraphic(doc.inputs),extension:'png'});graphicSheet.addImage(graphicId,{tl:{col:0,row:0},ext:{width:900,height:675},editAs:'absolute'});
 graphicSheet.mergeCells('A36:J38');graphicSheet.getCell('A36').value='Current plan: '+doc.name+'\nThis graphic is a snapshot at export. Editing workbook inputs updates formulas, but does not redraw this image. Export again from Housing for an updated graphic.';graphicSheet.getCell('A36').alignment={wrapText:true,vertical:'top'};graphicSheet.getCell('A36').font={name:'Calibri',size:11,color:{argb:'FF52665F'}};graphicSheet.getRow(36).height=58;graphicSheet.pageSetup={paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:1,printArea:'A1:J39'};
 const sh=wb.addWorksheet('Saved plans');sh.columns=[{header:'Scenario',key:'name',width:28},...CONFIG.map(c=>({header:c.label+(c.money?' (USD)':''),key:c.key,width:24})),{header:'Total homes',key:'units',width:18},{header:'Affordable homes',key:'affordable',width:22},{header:'Funding gap (negative = surplus, USD)',key:'gap',width:32},{header:'Public subsidy (USD)',key:'publicSubsidy',width:24},{header:'Reflection',key:'reflection',width:65}];sh.views=[{state:'frozen',ySplit:1,xSplit:1}];sh.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sh.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF173F3A'}};sh.getRow(1).alignment={wrapText:true};sh.getRow(1).height=42;
 for(const plan of plans){const r=calculate(plan.inputs);const row=sh.addRow({name:plan.name,...plan.inputs,aff:plan.inputs.aff/100,units:r.units,affordable:r.affordable,gap:r.gap,publicSubsidy:r.publicSubsidy,reflection:plan.reflection||''});row.alignment={wrapText:true,vertical:'top'};row.height=45;CONFIG.forEach((c,i)=>row.getCell(i+2).numFmt=c.money?money:c.key==='aff'?'0%':'#,##0');row.getCell(12).numFmt=money;row.getCell(13).numFmt=money;}
 sh.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,plans.length+1),column:14}};if(!plans.length)sh.getCell('A2').value='No saved plans in this account.';
 return wb;
}
$('pdf').onclick=()=>busyButton('pdf',async()=>{const pdf=await makePdf(currentDocument());download('housing-planning-brief.pdf',pdf.output('arraybuffer'),'application/pdf');$('feedback').textContent='PDF downloaded for the current plan.'});
$('excel').onclick=()=>busyButton('excel',async()=>{const wb=await makeWorkbook(currentDocument(),scenarioRows);download('housing-scenarios.xlsx',await wb.xlsx.writeBuffer(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');$('feedback').textContent='Excel workbook downloaded: current plan, optional baseline, and saved plans.'});
