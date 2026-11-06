import {initFeedback} from './feedback.js';
initFeedback({pause:()=>window.nodewayConceptDesign?.pause(),context:()=>window.nodewayConceptDesign?.context()||{kind:'sample-concept'}});
