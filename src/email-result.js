import {DRAFT_KEY,RECEIPT_KEY,matchesReceipt} from './feedback-data.js';
const params=new URLSearchParams(location.search),batchId=params.get('batch'),nonce=params.get('receipt');
const title=document.getElementById('result-title'),message=document.getElementById('result-message');
try{
 const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');
 const receipt={batchId,nonce,acceptedAt:new Date().toISOString()};
 if(matchesReceipt(receipt,saved.pending)){
  localStorage.setItem(RECEIPT_KEY,JSON.stringify(receipt));
  title.textContent='Email service handoff completed';
  message.textContent='The email service returned you to Nodeway. Your original tab can now mark this batch as accepted by the service.';
 }else{message.textContent='No matching pending batch was found in this browser. Return to your original tab; your drafts have not been cleared.';}
}catch{message.textContent='The email service returned you to Nodeway, but browser storage is unavailable. Your original tab still has your comments. Check with Nicole before resending.';}
// The receipt token is only for matching this local handoff, not proof of inbox delivery.
history.replaceState(null,'',location.pathname);
