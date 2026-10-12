import NativeShareLink from './NativeShareLink';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIReport, { reportText, reportValue } from './AIReport';
import './NativeAdCopy.css';

export const EXAMPLES = [
  {label:'Fictional garden kit',product:'Fictional Leaf & Mug starter planter kit',audience:'Apartment gardeners who want a simple indoor starter kit',tone:'Friendly, specific and calm',platform:'instagram',industry:'Home and garden',market:'Illustrative English-speaking urban consumer market',copy:'Fictional Leaf & Mug: plan a small indoor garden with a starter planter kit. Explore the kit details.',position:'An illustrative beginner-friendly kit; claims and pricing require separate review',format:'Instagram Story (9:16)',languages:['Spanish','French'],discount:'15',count:2},
  {label:'Fictional team planner',product:'Fictional Ridge task planning software for small teams',audience:'Small creative teams organizing a weekly project plan',tone:'Professional, clear and approachable',platform:'linkedin',industry:'Business software',market:'Illustrative B2B small-team planning audience',copy:'Fictional Ridge: organize your next weekly team plan in one workspace. Review the planning features.',position:'An illustrative planning tool; no customer counts or performance uplift are asserted',format:'LinkedIn Banner (1.91:1)',languages:['German','Dutch'],discount:'20',count:3},
  {label:'Fictional book club',product:'Fictional Lantern monthly reading newsletter',audience:'Adults interested in a relaxed monthly reading discussion',tone:'Warm, thoughtful and inclusive',platform:'facebook',industry:'Publishing',market:'Illustrative community reading audience',copy:'Fictional Lantern: discover a new reading discussion each month. Explore the newsletter topics.',position:'An illustrative community newsletter; no real subscriptions or endorsements are asserted',format:'Facebook Feed (1:1)',languages:['Italian','Portuguese'],discount:'10',count:4},
];
const text=(key,label,optional=false)=>({key,label,type:'textarea',optional});
const input=(key,label,optional=false)=>({key,label,type:'text',optional});
const select=(key,label,options,optional=false)=>({key,label,type:'select',options,optional});
const campaign={key:'campaign_id',label:'Saved campaign',type:'source',source:'campaigns',optional:true};
const copy=text('copy_text','Copy to review');
const metrics='Clarity, message relevance and CTA suitability; model assumptions only, no measured CTR or conversions';
const languages=['Spanish','French','German','Italian','Portuguese','Japanese','Korean','Chinese (Simplified)','Arabic','Hindi','Russian','Dutch'];
export const TOOLS = {
  'brand-voice':{title:'Brand Voice Consistency Checker',fields:[{...text('brand_guidelines','Brand guidelines'),maxLength:3000},copy],endpoint:'/ai/brand-voice-check'},
  benchmark:{title:'Copy Performance Benchmarking',note:'AI estimates are unverified assumptions, not measured industry benchmarks.',fields:[input('industry','Industry'),copy,input('metric_focus','Metric focus',true)],feature:'performance_predictions'},
  translator:{title:'Multi-Language Campaign Translator',fields:[copy,input('brand_tone','Brand tone',true),{key:'target_languages',label:'Target languages',type:'languages',options:languages}],feature:'ad_copies'},
  competitor:{title:'Competitor Sentiment Review',note:'This reviews the supplied context; it does not scrape or verify live competitor campaigns.',fields:[text('competitors','Competitor context'),text('our_position','Our position')],feature:'competitor_analyses'},
  audience:{title:'Audience Sentiment Predictor',note:'Predicted sentiment and conversion scores are advisory estimates, not observed customer reactions.',fields:[copy,text('audience_description','Target audience',true),select('platform','Platform',['general','facebook','instagram','google','linkedin','tiktok','x'],true)],endpoint:'/ai/audience-sentiment'},
  template:{title:'Copy Template Builder',fields:[text('template','Template with named placeholders'),{key:'slots',label:'Template slots',type:'slots'}],feature:'ad_copies'},
  visual:{title:'Visual + Copy Pairing',note:'Generates copy and image direction for review; no image rendering or publication is performed.',fields:[text('brief','Art direction brief'),select('ad_format','Ad format',['Instagram Story (9:16)','Facebook Feed (1:1)','Twitter Card (1.91:1)','LinkedIn Banner (1.91:1)','Display 728x90','Display 300x250','Pinterest Pin (2:3)'],true)],feature:'image_prompts'},
  persona:{title:'Audience Persona Generator',note:'Personas are fictional planning hypotheses, not verified audience research.',fields:[text('product_or_offer','Product or offer'),input('market','Target market context',true),select('n','Number of personas',[2,3,4,5])],feature:'target_audiences'},
  scoring:{title:'Copy Scoring Review',fields:[copy,{key:'generated_content_id',label:'Saved copy source',type:'source',source:'features',optional:true,contentKey:'copy_text'}],endpoint:'/ai/score-copy'},
  compliance:{title:'Advertising Policy Review',note:'AI review does not approve publication or satisfy authoritative evidence, rights or human approval requirements.',fields:[copy,select('platform','Platform',['general','Google Ads','Facebook/Meta','LinkedIn','Instagram','Twitter/X','TikTok','Email'],true)],endpoint:'/ai/compliance-check'},
  'industry-benchmark':{title:'Industry Benchmark Review',note:'This is an AI estimate. A configured external key does not supply measured benchmark data.',fields:[input('industry','Industry'),copy,input('metric_focus','Metric focus',true)],endpoint:'/ai/industry-benchmark'},
  'ab-framework':{title:'Generate A/B Test Variants',note:'Creates draft variations and a hypothesis. It does not run an experiment or establish a measured winner.',fields:[{...text('product_description','Product description'),maxLength:2000,minLength:10},input('target_audience','Target audience',true),{...text('hypothesis','Hypothesis',true),maxLength:1000},campaign],endpoint:'/ab-tests'},
};
export function generationTool(feature,title=feature.replaceAll('_',' ')) {return {id:feature,title,feature,endpoint:'/ai/generate',fields:[{...text('prompt','Prompt'),maxLength:2000},{...text('context','Additional context',true),maxLength:1000},campaign],note:'Generated copy remains a draft for human review. Saved brand context and campaign references keep their native authority.'};}
function initial(tool) {return Object.fromEntries(tool.fields.map(field=>[field.key,field.type==='languages'||field.type==='slots'?[]:'']));}
function rows(data) {const value=Array.isArray(data)?data:data?.data;if(!Array.isArray(value)||value.some(row=>!row||!Number.isSafeInteger(Number(row.id))||Number(row.id)<1))throw Error('The saved source list returned an invalid response. Retry the source list.');return value;}
function errorText(error) {if(error.response?.status===401)return 'Your session expired. Sign in again, then retry.';const body=error.response?.data;return body?.error?(body.error+(typeof body.details==='string'?' · '+body.details:'')):error.message||'The request failed. Retry when ready.';}
export function createExample(tool,scenario,current,sources) {
  const e=EXAMPLES[scenario],result={
    prompt:`Create ${tool.title} for ${e.product}. Audience: ${e.audience}. Tone: ${e.tone}. Provide draft alternatives for review; use no invented endorsements, observed results or approved claims.`,
    context:`Fictional practice scenario. Position: ${e.position}. Channel: ${e.platform}. CTA: explore product details. Retain separate source, rights, evidence and publication approvals.`,
    copy_text:e.copy,brand_guidelines:`Fictional practice guidelines: ${e.tone}. Avoid unsupported superlatives, guaranteed outcomes, personal attributes, and implied approvals. Explain unresolved claims.`,
    industry:e.industry,metric_focus:metrics,brand_tone:e.tone,target_languages:[...e.languages],
    competitors:`Fictional Example One: emphasizes simplicity. Fictional Example Two: emphasizes planning flexibility. Illustrative supplied context only; no live market research.`,our_position:e.position,
    audience_description:e.audience,platform:tool===TOOLS.compliance?['Instagram','LinkedIn','Facebook/Meta'][scenario]:e.platform,
    template:'Explore {product} for {audience}. Illustrative offer: {discount}% off.',slots:[{name:'product',values:e.product},{name:'audience',values:e.audience},{name:'discount',values:e.discount}],
    brief:`Fictional visual exercise for ${e.product}. Show a clear product focus and accessible text contrast. ${e.tone}. No real logos, customer endorsements or licensed assets supplied.`,ad_format:e.format,
    product_or_offer:e.product,market:e.market,n:e.count,product_description:e.product+'; a fictional planning exercise without verified customer or performance claims.',target_audience:e.audience,
    hypothesis:'For this fictional draft experiment, clearer wording may be easier to understand; actual performance requires a separately authorized measured test.',
  };
  const filled={};
  for(const field of tool.fields) {
    if(field.type==='source') {
      const choices=sources[field.source]||[],selected=choices.find(row=>String(row.id)===String(current[field.key]))||choices[scenario%Math.max(choices.length,1)];
      filled[field.key]=selected?String(selected.id):'';
      if(selected&&field.contentKey)filled[field.contentKey]=choices.some(row=>String(row.id)===String(current[field.key]))&&current[field.contentKey]?current[field.contentKey]:reportText(reportValue(selected.result));
    } else if(filled[field.key]===undefined) filled[field.key]=result[field.key];
  }
  return filled;
}
export function nativePayload(tool,form) {
  const values={};for(const field of tool.fields){const value=form[field.key];if(field.type==='source'){if(value)values[field.key]=Number(value);}else if(field.key==='n')values.n=Number(value);else values[field.key]=value;}
  if(tool===TOOLS.translator&&!values.target_languages.length)throw Error('Choose at least one actual target language.');
  if(tool===TOOLS.template&&(!values.slots.length||values.slots.some(slot=>!slot.name.trim()||!slot.values.trim())))throw Error('Fill each template slot name and its values before generation.');
  if(tool.endpoint==='/ai/generate')return {feature:tool.feature,prompt:values.prompt,context:values.context,...(values.campaign_id?{campaign_id:values.campaign_id}:{})};
  if(tool.endpoint)return values;
  let prompt;
  if(tool===TOOLS.benchmark)prompt=`Industry: ${values.industry}\nMetric focus: ${values.metric_focus}\n\nCopy to benchmark:\n${values.copy_text}\n\nReview the supplied draft. Any benchmark figures must be explicitly labeled unverified model assumptions; no measured data was supplied.`;
  if(tool===TOOLS.translator)prompt=`Source copy:\n${values.copy_text}\n\nTarget languages: ${values.target_languages.join(', ')}\nBrand tone: ${values.brand_tone}\n\nTranslate the ad copy to each target language while preserving brand voice and adapting cultural references. Return a structured translation review.`;
  if(tool===TOOLS.competitor)prompt=`Competitors: ${values.competitors}\nOur position: ${values.our_position}\n\nReview only the supplied competitor context; do not imply live scraping or verified research. Return structured positioning and messaging recommendations.`;
  if(tool===TOOLS.template){const slots=Object.fromEntries(values.slots.filter(slot=>slot.name).map(slot=>[slot.name,slot.values.split(',').map(value=>value.trim()).filter(Boolean)]));prompt=`Template: ${values.template}\nSlot values: ${JSON.stringify(slots)}\n\nExpand the supplied template and generate draft variations for review, preserving the named slot values.`;}
  if(tool===TOOLS.visual)prompt=`Art direction brief: ${values.brief}\nAd format: ${values.ad_format}\n\nGenerate matching ad copy and detailed image direction for review. No actual image rendering or publication is performed.`;
  if(tool===TOOLS.persona)prompt=`Product / offer:\n${values.product_or_offer}\n\nTarget market context:\n${values.market}\n\nGenerate ${values.n} distinct fictional customer personas as planning hypotheses. Return structured personas, clearly distinguishing assumptions from supplied facts.`;
  if(prompt.length>2000)throw Error('The combined native prompt exceeds 2,000 characters. Shorten the supplied fields before generating. No provider request was sent.');
  return {feature:tool.feature,prompt};
}
export default function NativeAIForm({tool,onResult,initialInput}) {
  const [form,setForm]=useState(()=>({...initial(tool),...(initialInput||{})})),[sources,setSources]=useState({}),[sourceError,setSourceError]=useState(''),[sourceLoading,setSourceLoading]=useState(false),[reload,setReload]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState(''),[response,setResponse]=useState(null),[notice,setNotice]=useState('');
  const active=useRef(null),sequence=useRef(0),mounted=useRef(true);
  const cancel=()=>{sequence.current++;active.current?.abort();active.current=null;setPending(false);};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;active.current?.abort();};},[]);
  useEffect(()=>{if(initialInput){cancel();setForm({...initial(tool),...initialInput});setResponse(null);}},[initialInput]);
  const sourceKeys=[...new Set(tool.fields.filter(field=>field.type==='source').map(field=>field.source))].join(',');
  useEffect(()=>{const keys=sourceKeys?sourceKeys.split(','):[];if(!keys.length)return;const controller=new AbortController();setSourceLoading(true);setSourceError('');Promise.all(keys.map(async key=>{const {data}=await api.get('/'+key,{params:{limit:100},signal:controller.signal});return[key,rows(data)];})).then(entries=>{if(!controller.signal.aborted)setSources(Object.fromEntries(entries));}).catch(error=>{if(!controller.signal.aborted)setSourceError(errorText(error));}).finally(()=>{if(!controller.signal.aborted)setSourceLoading(false);});return()=>controller.abort();},[sourceKeys,reload]);
  const fill=index=>{setForm(current=>createExample(tool,index,current,sources));setResponse(null);setError('');setNotice(`Example ${index+1} filled the entire editable draft. Generation remains a separate action.`);};
  const change=(key,value)=>setForm(current=>({...current,[key]:value}));
  const generate=async event=>{
    event.preventDefault();if(active.current||sourceError)return;
    const controller=new AbortController(),id=++sequence.current;active.current=controller;setPending(true);setError('');setResponse(null);
    try{const {data}=await api.post(tool.endpoint||'/ai/generate',nativePayload(tool,form),{signal:controller.signal});if(id!==sequence.current||controller.signal.aborted||!mounted.current)return;if(!data||typeof data!=='object'||!['response','score','compliance','sentiment','benchmark','ab_test'].some(key=>data[key]!==undefined))throw Error('The provider result was unreadable. No successful result is displayed.');setResponse(data);onResult?.(data);}
    catch(error){if(id===sequence.current&&!controller.signal.aborted&&mounted.current)setError(errorText(error));}
    finally{if(id===sequence.current&&mounted.current){active.current=null;setPending(false);}}
  };
  const answer=response?(response.response??response.score??response.compliance??response.sentiment??response.benchmark??{variant_a:response.variant_a,variant_b:response.variant_b,hypothesis:response.ab_test?.hypothesis}):null;
  return <section className="native-ai-form" data-native-tool={tool.id||tool.title}><form onSubmit={generate} aria-label={tool.title}>
    <div className="native-ai-examples" aria-label="Complete native AI examples"><strong>Fill every field</strong>{EXAMPLES.map((example,index)=><button type="button" className="btn btn-outline btn-sm" disabled={pending||sourceLoading||Boolean(sourceError)} key={example.label} onClick={()=>fill(index)}>Demo AI · {example.label}</button>)}</div>
    <p className="ai-muted">Examples are fictional drafting exercises. Actual saved references stay real; examples do not run AI or authorize external actions.</p>
    {tool.note&&<p className="ai-muted">{tool.note}</p>}{!tool.endpoint&&<p className="ai-muted">The combined native request accepts up to 2,000 characters. Longer manually entered context needs shortening before generation.</p>}{notice&&<p role="status">{notice}</p>}
    {sourceLoading&&<p role="status">Loading your saved sources…</p>}{sourceError&&<div role="alert" className="ai-alert">{sourceError}<button type="button" className="btn btn-outline" onClick={()=>setReload(value=>value+1)}>Retry saved sources</button></div>}
    {tool.fields.map(field=><div className="form-group" key={field.key} data-native-field={field.key}><label htmlFor={'native-'+field.key}>{field.label}{field.optional?' (optional)':' *'}</label>
      {field.type==='source'?<><select id={'native-'+field.key} value={form[field.key]} disabled={pending||sourceLoading} onChange={event=>{const value=event.target.value;setForm(current=>{const selected=(sources[field.source]||[]).find(row=>String(row.id)===value);return{...current,[field.key]:value,...(selected&&field.contentKey?{[field.contentKey]:reportText(reportValue(selected.result))}:{})};});}}><option value="">No saved source selected</option>{(sources[field.source]||[]).map(row=><option key={row.id} value={row.id}>{row.name||row.prompt||row.feature_type||'Saved record'} · #{row.id}</option>)}</select>{!sourceLoading&&!sourceError&&!(sources[field.source]||[]).length&&<p className="ai-muted">No accessible {field.source==='features'?'saved copy':'campaign'} is available. This optional reference stays empty; create a genuine saved source to attach it.</p>}</>:
      field.type==='languages'?<div id={'native-'+field.key} className="native-language-options">{field.options.map(value=><label key={value}><input type="checkbox" disabled={pending} checked={form[field.key].includes(value)} onChange={event=>change(field.key,event.target.checked?[...form[field.key],value]:form[field.key].filter(item=>item!==value))}/>{value}</label>)}</div>:
      field.type==='slots'?<div id={'native-'+field.key}>{form.slots.map((slot,index)=><div className="native-slot" key={index}><label>Slot name<input disabled={pending} value={slot.name} required onChange={event=>change('slots',form.slots.map((row,i)=>i===index?{...row,name:event.target.value}:row))}/></label><label>Values, separated by commas<input disabled={pending} value={slot.values} required onChange={event=>change('slots',form.slots.map((row,i)=>i===index?{...row,values:event.target.value}:row))}/></label><button type="button" className="btn btn-outline" disabled={pending} onClick={()=>change('slots',form.slots.filter((_,i)=>i!==index))}>Remove slot</button></div>)}<button type="button" disabled={pending} className="btn btn-outline" onClick={()=>change('slots',[...form.slots,{name:'',values:''}])}>Add slot</button></div>:
      field.type==='select'?<select id={'native-'+field.key} value={form[field.key]} disabled={pending} required={!field.optional} onChange={event=>change(field.key,event.target.value)}><option value="">Select an option</option>{field.options.map(value=><option key={value} value={value}>{value}</option>)}</select>:
      field.type==='textarea'?<textarea id={'native-'+field.key} value={form[field.key]} disabled={pending} required={!field.optional} minLength={field.minLength} maxLength={field.maxLength||5000} rows={4} onChange={event=>change(field.key,event.target.value)}/>:
      <input id={'native-'+field.key} value={form[field.key]} disabled={pending} required={!field.optional} maxLength={field.maxLength||500} onChange={event=>change(field.key,event.target.value)}/>}</div>)}
    <div className="native-ai-actions"><button type="submit" className="btn btn-primary" disabled={pending||sourceLoading||Boolean(sourceError)}>{pending?'Generating…':'Generate with OpenRouter'}</button><button type="button" className="btn btn-outline" onClick={cancel}>Cancel</button></div>
  </form>{error&&<div className="ai-alert" role="alert">{error}</div>}<AIReport response={answer} title={tool.title} model={response?.model} tokens={response?.tokens_used} loading={pending}/>{response?.saved_id&&(tool.feature||tool.endpoint==='/ai/brand-voice-check')&&<NativeShareLink key={response.saved_id} item={{id:response.saved_id}}/>}</section>;
}
export function NativeToolPage({id}) {const navigate=useNavigate(),tool=TOOLS[id];return <main className="page-container"><header className="page-header"><button type="button" className="btn btn-ghost" onClick={()=>navigate('/')}>Back</button><h1>{tool.title}</h1></header><NativeAIForm key={id} tool={tool}/></main>;}
export function NativeToolTabs({ids}) {const [id,setId]=useState(ids[0]);return <main className="page-container"><header className="page-header"><h1>Copy Scoring & Policy Review</h1></header><div className="tabs" aria-label="Native copy tools">{ids.map(value=><button className={'btn '+(value===id?'btn-primary':'btn-outline')} key={value} onClick={()=>setId(value)}>{TOOLS[value].title}</button>)}</div><NativeAIForm key={id} tool={TOOLS[id]}/></main>;}
