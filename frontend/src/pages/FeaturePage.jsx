import {useParams} from 'react-router-dom';
import NativeHistory from '../components/NativeHistory';
export default function FeaturePage(){const {featureKey}=useParams();return <NativeHistory key={featureKey} featureKey={featureKey}/>;}
