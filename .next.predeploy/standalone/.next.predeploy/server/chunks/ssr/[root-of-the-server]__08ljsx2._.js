module.exports=[522734,(a,b,c)=>{b.exports=a.x("fs",()=>require("fs"))},254799,(a,b,c)=>{b.exports=a.x("crypto",()=>require("crypto"))},723862,a=>a.a(async(b,c)=>{try{let b=await a.y("pg-587764f78a6c7a9c");a.n(b),c()}catch(a){c(a)}},!0),892869,a=>a.a(async(b,c)=>{try{var d=a.i(949887),e=a.i(668138),f=b([d,e]);async function g({params:a}){var b,c;let d,{id:f}=await a,h=(0,e.getDb)(),i=await h.get(`
    SELECT p.title, p.content, p.tag, u.username
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ? AND p.deleted = 0
  `,[f]);if(!i)return{title:"Пост не найден",robots:{index:!1,follow:!0}};let j=i.tag?`${i.title} — ${i.tag}`:i.title,k=(b=i.content,c=`Пост ${i.username} в PADDOCK — русскоязычном F1-комьюнити.`,(d=(b||"").replace(/\s+/g," ").trim())?d.length>155?`${d.slice(0,152)}...`:d:c);return{title:j,description:k,alternates:{canonical:`/post/${f}`},openGraph:{title:j,description:k,type:"article",images:["/paddock-og.svg"]},twitter:{card:"summary_large_image",title:j,description:k,images:["/paddock-og.svg"]}}}[d,e]=f.then?(await f)():f,a.s(["default",0,function({children:a}){return a},"generateMetadata",0,g]),c()}catch(a){c(a)}},!1),991586,a=>{a.n(a.i(892869))},993015,a=>{a.v(b=>Promise.all(["server/chunks/ssr/src_lib_achievements_ts_1yujird._.js"].map(b=>a.l(b))).then(()=>b(217960)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__08ljsx2._.js.map