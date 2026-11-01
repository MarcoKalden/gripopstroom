const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:Math.round(856*96/25.4),height:Math.round(2006*96/25.4)}});
await p.goto('file://'+process.cwd()+'/rollup.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(800);
await p.pdf({path:'rollup.pdf',width:'856mm',height:'2006mm',printBackground:true,pageRanges:'1'});
await p.setViewportSize({width:Math.round(856*96/25.4),height:Math.round(2006*96/25.4)});
await p.screenshot({path:'rollup-preview.png',scale:'css'});await b.close()})()
