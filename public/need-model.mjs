// Classroom scenarios, not an adopted forecast. Counts remain unrounded until allocation.
export const bands=['Extremely low','Very low','Low','Moderate','Above moderate'];
export const types=['ADU / cottage','Duplex / fourplex','Townhome','Apartment / condominium','Detached home'];
export const limits={
 extreme:[34650,39600,44550,49450,53450,57400,61350,65300],
 veryLow:[57700,65950,74200,82400,89000,95600,102200,108800],
 low:[92300,105500,118700,131850,142400,152950,163500,174050],
 moderate:[112050,128100,144100,160100,172900,185700,198500,211350],
 median:[93400,106700,120050,133400,144050,154750,165400,176100]
};
export const sources=[
 {name:'Census QuickFacts, ACS 2020–2024',url:'https://www.census.gov/quickfacts/fact/table/healdsburgcitycalifornia/BZA010223',detail:'4,651 households; 60.1% owner occupancy; 2.38 persons per household; $2,158 median gross rent; $950,100 median owner-occupied value. Sample estimates, used without aging as 2026 proxies. Value is not a current sale price.'},
 {name:'Earlier Housing Needs Estimator chat',detail:'5,138 total units carried forward as an unverified stock proxy; 2% annual household growth is a classroom scenario. Current Census API retrieval was unavailable. Total stock can include second homes and unavailable vacancies.'},
 {name:'Housing_Needs_Calculator_2020Jan29.xlsx',detail:'T1_InputSummary A15:A26: 7,220 jobs (2018), 17.5% live/work share (source vintage unspecified), 212.6667 annual job growth, 5,931 employed people / 3,644 earning households. T3_Incomes E11:E15: 274, 382, 423, 371, 1,503 working-age householders, total 2,953. Historical and approximately classified; excludes age 65+. Income shares are classroom proxies, not current HCD-category counts. T5_Annual Units supplies the workforce method.'},
 {name:"Todd's Housing Needs Analysis Calculator..xlsx",detail:'Sheet1 B57:B63 and E57:F63 compare $810,000 / $900,000 prices, 80% mortgages, and 30% housing budgets. The 38% note conflicts with the 30% cells. This estimator uses an explicit editable budget and includes non-mortgage costs. Unlabeled totals at the top are not treated as current need.'},
 {name:'ProForma_062623 Healdsburg.xlsm and ProForma_062623_FINAL.xlsm',detail:'Physical Inputs, Basic Financial, Residential Owner and Residential Rental inform the distinction between building form, tenure and feasibility. MarketAnalysis contains Washington cities; Physical Inputs B24 identifies Puget Sound, WA. Market prices and cached project outputs are not imported as Healdsburg evidence. VBA macros were not run.'},
 {name:'HCD revised 2026 income limits, effective June 23, 2026',url:'https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf',detail:'PDF page 13, Sonoma County, household sizes 1–8. Published dollar limits are used directly, not simple AMI multiples. Acutely low households are included in extremely low. All affordability figures stay in 2026 dollars; these are budget examples, not program eligibility or regulated rents.'},
 {name:'Healdsburg 2025 Annual Progress Report, March 16, 2026 agenda, item 6.e',url:'https://www.ci.healdsburg.ca.us/AgendaCenter/ViewFile/Agenda/_03162026-1679',detail:'2023–2031 RHNA: 190 very low (including extremely low), 109 low, 49 moderate, 128 above moderate; reported progress through 2025: 35, 42, 19, 122. Total 476, progress 218, remaining 258. Progress credits are not a stock inventory or a 2040 forecast.'}
];
export const defaults={households:4651,stock:5138,unavailable:0,growth:2,vacancy:5,annualBuild:0,
 jobs:7220,localShare:17.5,targetShare:30,jobGrowth:212.6666666667,workers:5931/3644,
 incomeWeights:[274,382,423,371,1503].map(n=>n/2953*100),renterShares:[39.9,39.9,39.9,39.9,39.9],
 rentalMix:[10,15,10,60,5],ownerMix:[5,15,30,20,30],size:4,budget:30,utilities:200,
 rate:6.5,term:30,down:20,tax:1.1,insurance:0.35,maintenance:1,hoa:150,upperAMI:150,burden:35};
const scalarRanges={households:[0,1000000],stock:[0,1000000],unavailable:[0,1000000],growth:[-5,10],vacancy:[0,30],annualBuild:[0,100000],jobs:[0,1000000],localShare:[0,100],targetShare:[0,100],jobGrowth:[0,100000],workers:[0.1,10],size:[1,8],budget:[1,60],utilities:[0,10000],rate:[0,20],term:[1,50],down:[0,99],tax:[0,10],insurance:[0,10],maintenance:[0,10],hoa:[0,10000],upperAMI:[121,500],burden:[0,100]};
export function validate(input){
 const a={}; for(const [key,[min,max]] of Object.entries(scalarRanges)){
  const v=input[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`Check ${key}: enter a number from ${min} to ${max}.`);a[key]=v;
 }
 if(!Number.isInteger(a.size)||!Number.isInteger(a.term))throw Error('Household size and loan term must be whole numbers.');
 if(a.unavailable>a.stock)throw Error('Unavailable units cannot exceed total stock.');
 for(const key of ['incomeWeights','renterShares','rentalMix','ownerMix']){
  const v=input[key];if(!Array.isArray(v)||v.length!==5||v.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>100))throw Error(`Check all five ${key} percentages.`);
  if(key!=='renterShares'&&Math.abs(v.reduce((s,x)=>s+x,0)-100)>0.02)throw Error(`${key} must total 100%.`);a[key]=[...v];
 }return a;
}
// Largest remainder preserves whole-home totals, including small scenarios.
export function allocate(total,weights){const sum=weights.reduce((s,n)=>s+n,0);if(sum===0)return weights.map(()=>0);const exact=weights.map(n=>total*n/sum),out=exact.map(Math.floor);let left=total-out.reduce((s,n)=>s+n,0);const order=exact.map((n,i)=>({i,r:n-out[i]})).sort((a,b)=>b.r-a.r||a.i-b.i);for(let j=0;j<left;j++)out[order[j].i]++;return out;}
export function affordability(a){const i=a.size-1,inc=[limits.extreme[i],limits.veryLow[i],limits.low[i],limits.moderate[i],limits.median[i]*a.upperAMI/100];const r=a.rate/1200,n=a.term*12,factor=r===0?1/n:r/(1-Math.pow(1+r,-n));
 return inc.map(income=>{const monthly=income*a.budget/1200;const price=Math.max(0,(monthly-a.hoa)/((1-a.down/100)*factor+(a.tax+a.insurance+a.maintenance)/1200));return{income,monthly,rent:Math.max(0,monthly-a.utilities),price,downPayment:price*a.down/100};});}
export function housingRows(total,a){return allocate(total,a.incomeWeights).map((count,i)=>{const [rent,own]=allocate(count,[a.renterShares[i],100-a.renterShares[i]]);return{band:bands[i],total:count,rent,own,rentalTypes:allocate(rent,a.rentalMix),ownerTypes:allocate(own,a.ownerMix)};});}
export function estimate(input,year=2040,method='household'){
 const a=validate(input);if(!Number.isInteger(year)||year<2026||year>2040)throw Error('Choose a year from 2026 through 2040.');if(!['household','workforce'].includes(method))throw Error('Unknown method.');const elapsed=year-2026;
 const households=a.households*Math.pow(1+a.growth/100,elapsed),required=households/(1-a.vacancy/100),available=a.stock-a.unavailable+a.annualBuild*elapsed;
 const workforceCatchup=Math.max(0,a.jobs*(a.targetShare-a.localShare)/100)/a.workers;
 const workforceGrowth=a.jobGrowth*elapsed*a.targetShare/100/a.workers;
 const raw=method==='household'?Math.max(0,required-available):Math.max(0,workforceCatchup+workforceGrowth-a.annualBuild*elapsed);
 const total=Math.ceil(Math.max(0,raw-1e-9));
 const rows=housingRows(total,a),occupiedRows=housingRows(Math.round(households),a);
 return{year,method,households,required,available,raw,total,rows,occupiedRows,rent:rows.reduce((s,r)=>s+r.rent,0),own:rows.reduce((s,r)=>s+r.own,0),workforceCatchup,workforceGrowth,burdened:households*a.burden/100,affordability:affordability(a)};
}
