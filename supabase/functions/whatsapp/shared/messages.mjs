// Limite conservador abaixo dos 4096 caracteres do WhatsApp. Não corta pares Unicode.
export function splitReplies(replies, limit=3800){
 if(!Number.isInteger(limit)||limit<2)throw Error('Invalid message limit');
 return replies.flatMap(text=>{const parts=[];let part='';for(const character of String(text)){if(part.length+character.length>limit){parts.push(part);part='';}part+=character;}if(part)parts.push(part);return parts;});
}
