export function allowsPreviewHost(authority,port,lanAddresses=[]){
  const parts=String(authority||'').match(/^([a-zA-Z0-9.-]+)(?::(\d+))?$/);
  if(!parts||Number(parts[2]||80)!==Number(port))return false;
  const hostname=parts[1].toLowerCase();
  return ['localhost','127.0.0.1',...lanAddresses].includes(hostname);
}
