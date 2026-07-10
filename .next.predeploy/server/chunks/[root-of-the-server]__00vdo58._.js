module.exports=[522734,(e,t,a)=>{t.exports=e.x("fs",()=>require("fs"))},254799,(e,t,a)=>{t.exports=e.x("crypto",()=>require("crypto"))},723862,e=>e.a(async(t,a)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),a()}catch(e){a(e)}},!0),193695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},814747,(e,t,a)=>{t.exports=e.x("path",()=>require("path"))},918622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},270406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},453013,e=>e.a(async(t,a)=>{try{var r=e.i(842389),s=e.i(24026),o=e.i(79832),i=t([r,s,o]);async function n(e,{params:t}){let a,r,{id:i}=await t,d=await (0,o.getAuthUser)(),u=(0,s.getDb)(),E=d?`SELECT p.*,
      CASE WHEN ah.id IS NOT NULL THEN ah.name ELSE u.username END as username,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.display_name END as display_name,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.team END as team,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.driver END as driver,
      CASE WHEN ah.id IS NOT NULL THEN NULL WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      CASE WHEN ah.id IS NOT NULL THEN 'public' ELSE 'user' END as author_type,
      ah.slug as public_slug,
      ah.icon as public_icon,
      ah.color as public_color,
      ah.avatar as public_avatar,
      CASE WHEN p.anonymous = 1 THEN NULL ELSE u.username END as operator_username,
      (SELECT STRING_AGG(pt.tag, '||' ORDER BY pt.position) FROM post_tags pt WHERE pt.post_id = p.id) as tags_raw,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count,
      uv.direction as user_vote, CASE WHEN bm.user_id IS NOT NULL THEN 1 ELSE 0 END as bookmarked
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN communities ah ON ah.id = p.community_author_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    LEFT JOIN votes uv ON uv.post_id = p.id AND uv.user_id = ?
    LEFT JOIN bookmarks bm ON bm.post_id = p.id AND bm.user_id = ?
    WHERE p.id = ? AND p.deleted = 0`:`SELECT p.*,
      CASE WHEN ah.id IS NOT NULL THEN ah.name ELSE u.username END as username,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.display_name END as display_name,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.team END as team,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.driver END as driver,
      CASE WHEN ah.id IS NOT NULL THEN NULL WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      CASE WHEN ah.id IS NOT NULL THEN 'public' ELSE 'user' END as author_type,
      ah.slug as public_slug,
      ah.icon as public_icon,
      ah.color as public_color,
      ah.avatar as public_avatar,
      CASE WHEN p.anonymous = 1 THEN NULL ELSE u.username END as operator_username,
      (SELECT STRING_AGG(pt.tag, '||' ORDER BY pt.position) FROM post_tags pt WHERE pt.post_id = p.id) as tags_raw,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN communities ah ON ah.id = p.community_author_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    WHERE p.id = ? AND p.deleted = 0`,p=d?[d.userId,d.userId,i]:[i],c=await u.get(E,p);if(!c)return(0,o.apiError)("Пост не найден",404);let l=d?`SELECT c.*, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      COALESCE(cvu.upvotes, 0) as upvotes,
      COALESCE(cvd.downvotes, 0) as downvotes,
      cv.direction as user_vote
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN (SELECT comment_id, COUNT(*) as upvotes FROM comment_votes WHERE direction = 1 GROUP BY comment_id) cvu ON cvu.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) as downvotes FROM comment_votes WHERE direction = -1 GROUP BY comment_id) cvd ON cvd.comment_id = c.id
    LEFT JOIN comment_votes cv ON cv.comment_id = c.id AND cv.user_id = ?
    WHERE c.post_id = ? AND c.deleted = 0 AND u.banned = 0
    ORDER BY c.created_at ASC`:`SELECT c.*, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      COALESCE(cvu.upvotes, 0) as upvotes,
      COALESCE(cvd.downvotes, 0) as downvotes
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN (SELECT comment_id, COUNT(*) as upvotes FROM comment_votes WHERE direction = 1 GROUP BY comment_id) cvu ON cvu.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) as downvotes FROM comment_votes WHERE direction = -1 GROUP BY comment_id) cvd ON cvd.comment_id = c.id
    WHERE c.post_id = ? AND c.deleted = 0 AND u.banned = 0
    ORDER BY c.created_at ASC`,N=d?[d.userId,i]:[i],v=await u.all(l,N);return(0,o.apiResponse)({post:(a=c.tags_raw?c.tags_raw.split("||").filter(Boolean):c.tag?[c.tag]:[],r={...c},delete r.tags_raw,{...r,tags:a}),comments:v})}[r,s,o]=i.then?(await i)():i,e.s(["GET",0,n]),a()}catch(e){a(e)}},!1),565872,e=>e.a(async(t,a)=>{try{var r=e.i(747909),s=e.i(174017),o=e.i(996250),i=e.i(759756),n=e.i(561916),d=e.i(174677),u=e.i(869741),E=e.i(316795),p=e.i(487718),c=e.i(995169),l=e.i(47587),N=e.i(666012),v=e.i(570101),m=e.i(626937),O=e.i(10372),L=e.i(193695);e.i(52474);var R=e.i(600220),h=e.i(453013),_=t([h]);[h]=_.then?(await _)():_;let T=new r.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/posts/[id]/route",pathname:"/api/posts/[id]",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/posts/[id]/route.ts",nextConfigOutput:"standalone",userland:h,...{}}),{workAsyncStorage:S,workUnitAsyncStorage:A,serverHooks:x}=T;async function C(e,t,a){a.requestMeta&&(0,i.setRequestMeta)(e,a.requestMeta),T.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/posts/[id]/route";r=r.replace(/\/index$/,"")||"/";let o=await T.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!o)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:h,deploymentId:_,params:C,nextConfig:S,parsedUrl:A,isDraftMode:x,prerenderManifest:H,routerServerContext:g,isOnDemandRevalidate:w,revalidateOnlyGenerated:U,resolvedPathname:I,clientReferenceManifest:y,serverActionsManifest:f}=o,b=(0,u.normalizeAppPath)(r),D=!!(H.dynamicRoutes[b]||H.routes[I]),F=async()=>((null==g?void 0:g.render404)?await g.render404(e,t,A,!1):t.end("This page could not be found"),null);if(D&&!x){let e=!!H.routes[I],t=H.dynamicRoutes[b];if(t&&!1===t.fallback&&!e){if(S.adapterPath)return await F();throw new L.NoFallbackError}}let W=null;!D||T.isDev||x||(W=I,W="/index"===W?"/":W);let P=!0===T.isDev||!D,M=D&&!P;f&&y&&(0,d.setManifestsSingleton)({page:r,clientReferenceManifest:y,serverActionsManifest:f});let q=e.method||"GET",k=(0,n.getTracer)(),B=k.getActiveScopeSpan(),G=!!(null==g?void 0:g.isWrappedByNextServer),J=!!(0,i.getRequestMeta)(e,"minimalMode"),j=(0,i.getRequestMeta)(e,"incrementalCache")||await T.getIncrementalCache(e,S,H,J);null==j||j.resetRequestCache(),globalThis.__incrementalCache=j;let K={params:C,previewProps:H.preview,renderOpts:{experimental:{authInterrupts:!!S.experimental.authInterrupts},cacheComponents:!!S.cacheComponents,supportsDynamicResponse:P,incrementalCache:j,cacheLifeProfiles:S.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,s)=>T.onRequestError(e,t,r,s,g)},sharedContext:{buildId:h,deploymentId:_}},Y=new E.NodeNextRequest(e),$=new E.NodeNextResponse(t),V=p.NextRequestAdapter.fromNodeNextRequest(Y,(0,p.signalFromNodeResponse)(t));try{let o,i=async e=>T.handle(V,K).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=k.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=a.get("next.route");if(s){let t=`${q} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t),o&&o!==e&&(o.setAttribute("http.route",s),o.updateName(t))}else e.updateName(`${q} ${r}`)}),d=async o=>{var n,d;let u=async({previousCacheEntry:s})=>{try{if(!J&&w&&U&&!s)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await i(o);e.fetchMetrics=K.renderOpts.fetchMetrics;let n=K.renderOpts.pendingWaitUntil;n&&a.waitUntil&&(a.waitUntil(n),n=void 0);let d=K.renderOpts.collectedTags;if(!D)return await (0,N.sendResponse)(Y,$,r,K.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,v.toNodeOutgoingHttpHeaders)(r.headers);d&&(t[O.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=O.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,s=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=O.INFINITE_CACHE?void 0:K.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:s}}}}catch(t){throw(null==s?void 0:s.isStale)&&await T.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:w})},!1,g),t}},E=await T.handleResponse({req:e,nextConfig:S,cacheKey:W,routeKind:s.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:H,isRoutePPREnabled:!1,isOnDemandRevalidate:w,revalidateOnlyGenerated:U,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:J});if(!D)return null;if((null==E||null==(n=E.value)?void 0:n.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==E||null==(d=E.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});J||t.setHeader("x-nextjs-cache",w?"REVALIDATED":E.isMiss?"MISS":E.isStale?"STALE":"HIT"),x&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,v.fromNodeOutgoingHttpHeaders)(E.value.headers);return J&&D||p.delete(O.NEXT_CACHE_TAGS_HEADER),!E.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,m.getCacheControlHeader)(E.cacheControl)),await (0,N.sendResponse)(Y,$,new Response(E.value.body,{headers:p,status:E.value.status||200})),null};G&&B?await d(B):(o=k.getActiveScopeSpan(),await k.withPropagatedContext(e.headers,()=>k.trace(c.BaseServerSpan.handleRequest,{spanName:`${q} ${r}`,kind:n.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},d),void 0,!G))}catch(t){if(t instanceof L.NoFallbackError||await T.onRequestError(e,t,{routerKind:"App Router",routePath:b,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:w})},!1,g),D)throw t;return await (0,N.sendResponse)(Y,$,new Response(null,{status:500})),null}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,o.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:A})},"routeModule",0,T,"serverHooks",0,x,"workAsyncStorage",0,S,"workUnitAsyncStorage",0,A]),a()}catch(e){a(e)}},!1),790914,e=>{e.v(t=>Promise.all(["server/chunks/src_lib_achievements_ts_1evdf1z._.js"].map(t=>e.l(t))).then(()=>t(293991)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__00vdo58._.js.map