export const CONFIG = [
 {key:'density',label:'Density',min:10,max:100,step:5,unit:' homes/acre'},
 {key:'height',label:'Building height',min:1,max:8,step:1,unit:' stories'},
 {key:'aff',label:'Affordable housing share',min:0,max:100,step:5,unit:'%'},
 {key:'cost',label:'Development cost per home',min:250000,max:850000,step:25000,money:true},
 {key:'sub',label:'Public subsidy per affordable home',min:0,max:500000,step:25000,money:true},
 {key:'acres',label:'Site area',min:2,max:40,step:1,unit:' acres'},
 {key:'land',label:'Land cost per acre',min:500000,max:5000000,step:250000,money:true},
 {key:'market',label:'Market-rate revenue per home',min:400000,max:1200000,step:25000,money:true}
];
export const DEFAULT={density:45,height:4,aff:30,cost:425000,sub:150000,acres:12,land:2000000,market:700000};
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Scenario inputs must be an object.');
 return Object.fromEntries(CONFIG.map(c=>{const v=input[c.key];if(typeof v!=='number'||!Number.isFinite(v)||v<c.min||v>c.max||Math.abs((v-c.min)/c.step-Math.round((v-c.min)/c.step))>1e-7)throw Error('Invalid '+c.label+'.');return[c.key,v]}));
}
export function calculate(s){const units=Math.floor(s.acres*s.density),affordable=Math.round(units*s.aff/100),marketUnits=units-affordable,construction=units*s.cost,landCost=s.acres*s.land,totalCost=construction+landCost,marketRevenue=marketUnits*s.market,affordableRevenue=affordable*250000,publicSubsidy=affordable*s.sub,gap=totalCost-marketRevenue-affordableRevenue-publicSubsidy;return{units,affordable,marketUnits,construction,landCost,totalCost,marketRevenue,affordableRevenue,publicSubsidy,gap,goalPct:units/1600*100,maxDensity:s.height*24};}
export function scenarioDocument(body){
 const name=typeof body.name==='string'?body.name.trim():'';
 if(!name||name.length>80)throw Error('Use a scenario name between 1 and 80 characters.');
 if(body.reflection!=null&&typeof body.reflection!=='string')throw Error('Reflection must be text.');
 if((body.reflection||'').length>10000)throw Error('Reflection must be 10,000 characters or less.');
 return{name,inputs:validate(body.inputs),reflection:body.reflection||'',baseline:body.baseline?validate(body.baseline):null};
}
