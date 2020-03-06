
export const isEmptyOrNull=(v:any)=>{
    if(v===null || v===undefined) return true;
    if(typeof v !== 'string') return true;
    return v.replace(/\s/,'').length == 0;
}