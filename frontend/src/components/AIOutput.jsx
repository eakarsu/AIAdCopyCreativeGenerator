import AIReport from './AIReport';
export default function AIOutput({data,result,title='Copy review',isDemo=false}) { return <AIReport response={data ?? result} title={title} eyebrow={isDemo?'Manually authored training draft · no AI execution':'Saved advisory copy · human review required'} />; }
