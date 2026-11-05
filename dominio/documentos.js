import * as pdfjs from '../vendor/pdf.mjs';
import {exigir,Falha} from './modelo.js';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',import.meta.url).href;
export async function validarPDF(blob,{nome=blob?.name||'documento.pdf',upload=true,onProgress=()=>{}}={}){
 exigir(blob instanceof Blob,'Arquivo ausente.');if(upload)exigir(blob.size<=10000000,'PDF acima de 10.000.000 bytes.');exigir(blob.size>0,'PDF vazio.');exigir(/\.pdf$/i.test(nome),'Selecione arquivo PDF.');
 onProgress(10);const data=new Uint8Array(await blob.arrayBuffer());const head=new TextDecoder('latin1').decode(data.slice(0,1024)),end=new TextDecoder('latin1').decode(data.slice(-4096));
 exigir(/%PDF-\d\.\d/.test(head)&&/%%EOF\s*$/.test(end)&&/startxref\s+\d+/.test(end),'Estrutura PDF incompleta ou inválida. Extensão e MIME não bastam.');
 try{
  onProgress(30);const task=pdfjs.getDocument({data,stopAtErrors:true,isEvalSupported:false,useSystemFonts:true,standardFontDataUrl:new URL('../vendor/standard_fonts/',import.meta.url).href,cMapUrl:new URL('../vendor/cmaps/',import.meta.url).href,cMapPacked:true,wasmUrl:new URL('../vendor/wasm/',import.meta.url).href});
  const pdf=await task.promise;exigir(pdf.numPages>0,'PDF sem páginas.');
  for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);await page.getOperatorList();onProgress(30+Math.round(n/pdf.numPages*60));page.cleanup()}
  const pages=pdf.numPages;await pdf.destroy();onProgress(100);return {nome,tamanho:blob.size,paginas:pages,mime:'application/pdf',estruturaValidada:true};
 }catch(error){throw new Falha('Não foi possível validar a estrutura do PDF. '+(error.name==='PasswordException'?'O documento exige senha.':''),'documento')}
}
export async function packet(file,onProgress){const meta=await validarPDF(file,{onProgress});return {id:'upload-'+crypto.randomUUID(),blob:file,...meta}}
export async function textoPDF(blob){
 const task=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),stopAtErrors:true,isEvalSupported:false,useSystemFonts:true});
 const doc=await task.promise;try{const partes=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),text=await page.getTextContent();partes.push(...text.items.map(x=>x.str))}return partes.join(' ').replace(/\s+/g,' ').trim()}finally{await doc.destroy()}
}
export async function parecer(request,summary,at,autor=''){
 const {PDFDocument,StandardFonts,rgb}=window.PDFLib,doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let page,y;
 const clean=s=>String(s??'').replace(/[→≥≤]/g,x=>({'→':' -> ','≥':'>=','≤':'<='}[x])).replace(/[^\x20-\x7e\xa0-\xff\u2013\u2014\u2018\u2019\u201c\u201d]/g,' ');
 function newPage(){page=doc.addPage([595,842]);y=794;page.drawText('Mobilidade Unifor - PARECER DEMONSTRATIVO',{x:42,y,size:15,font:bold,color:rgb(.03,.29,.98)});y-=30;page.drawText('Sem valor institucional - nao comprova lancamento academico',{x:42,y:28,size:9,font})}
 const line=(text,{size=11,weight=false}={})=>{const f=weight?bold:font;let value=clean(text),words=value.split(/\s+/),row='';for(const w of words){if(f.widthOfTextAtSize(row+' '+w,size)>510){if(y<65)newPage();page.drawText(row,{x:42,y,size,font:f});y-=size+6;row=w}else row=(row?row+' ':'')+w}if(row){if(y<65)newPage();page.drawText(row,{x:42,y,size,font:f});y-=size+8}};
 newPage();line(request.protocolo||request.id,{weight:true});line('Consulta: '+at);if(autor)line('Exportado por: '+autor);line('Analise: '+summary.analise+' | Resultado: '+summary.resultado);line('Registro: '+summary.registro+' | Processo: '+summary.processo);if(summary.pendentes)line('PARECER PARCIAL: existem itens ainda pendentes.',{weight:true});
 for(const item of request.itens){y-=12;line('Item '+item.id+' - '+item.estado,{weight:true});line(item.origem.disciplina+' ('+item.origem.codigo+', '+item.origem.periodo+') -> '+item.credito.componente);line(item.origem.referencia+' | Matriz '+item.credito.matriz);line(item.parecer?.justificativa||'Sem parecer definitivo.');if(item.parecer)line('Autor: '+(item.parecer.autor||item.parecer.autorId)+' | '+(item.parecer.instante||item.parecer.data));}
 return new File([await doc.save()],`parecer_${request.protocolo||request.id}.pdf`,{type:'application/pdf'});
}
