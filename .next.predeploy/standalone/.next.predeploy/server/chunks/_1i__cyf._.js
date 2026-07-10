module.exports=[995031,e=>{"use strict";let a=new Uint8Array(16),E=[];for(let e=0;e<256;++e)E.push((e+256).toString(16).slice(1));e.s(["v4",0,function(e,T,t){return T||e||!crypto.randomUUID?function(e,T,t){let d=(e=e||{}).random??e.rng?.()??crypto.getRandomValues(a);if(d.length<16)throw Error("Random bytes length must be >= 16");if(d[6]=15&d[6]|64,d[8]=63&d[8]|128,T){if((t=t||0)<0||t+16>T.length)throw RangeError(`UUID byte range ${t}:${t+15} is out of buffer bounds`);for(let e=0;e<16;++e)T[t+e]=d[e];return T}return function(e,a=0){return(E[e[a+0]]+E[e[a+1]]+E[e[a+2]]+E[e[a+3]]+"-"+E[e[a+4]]+E[e[a+5]]+"-"+E[e[a+6]]+E[e[a+7]]+"-"+E[e[a+8]]+E[e[a+9]]+"-"+E[e[a+10]]+E[e[a+11]]+E[e[a+12]]+E[e[a+13]]+E[e[a+14]]+E[e[a+15]]).toLowerCase()}(d)}(e,T,t):crypto.randomUUID()}],995031)},203422,e=>{"use strict";var a=e.i(254799),E=null;function T(e,T){if("number"!=typeof(e=e||b))throw Error("Illegal arguments: "+typeof e+", "+typeof T);e<4?e=4:e>31&&(e=31);var t=[];return t.push("$2b$"),e<10&&t.push("0"),t.push(e.toString()),t.push("$"),t.push(n(function(e){try{return crypto.getRandomValues(new Uint8Array(e))}catch{}try{return a.default.randomBytes(e)}catch{}if(!E)throw Error("Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative");return E(e)}(N),N)),t.join("")}function t(e,a,E){if("function"==typeof a&&(E=a,a=void 0),"function"==typeof e&&(E=e,e=void 0),void 0===e)e=b;else if("number"!=typeof e)throw Error("illegal arguments: "+typeof e);function t(a){r(function(){try{a(null,T(e))}catch(e){a(e)}})}if(!E)return new Promise(function(e,a){t(function(E,T){E?a(E):e(T)})});if("function"!=typeof E)throw Error("Illegal callback: "+typeof E);t(E)}function d(e,a){if(void 0===a&&(a=b),"number"==typeof a&&(a=T(a)),"string"!=typeof e||"string"!=typeof a)throw Error("Illegal arguments: "+typeof e+", "+typeof a);return O(e,a)}function i(e,a,E,T){function d(E){"string"==typeof e&&"number"==typeof a?t(a,function(a,t){O(e,t,E,T)}):"string"==typeof e&&"string"==typeof a?O(e,a,E,T):r(E.bind(this,Error("Illegal arguments: "+typeof e+", "+typeof a)))}if(!E)return new Promise(function(e,a){d(function(E,T){E?a(E):e(T)})});if("function"!=typeof E)throw Error("Illegal callback: "+typeof E);d(E)}function c(e,a){for(var E=e.length^a.length,T=0;T<e.length;++T)E|=e.charCodeAt(T)^a.charCodeAt(T);return 0===E}var r="function"==typeof setImmediate?setImmediate:"object"==typeof scheduler&&"function"==typeof scheduler.postTask?scheduler.postTask.bind(scheduler):setTimeout;function s(e){for(var a=0,E=0,T=0;T<e.length;++T)(E=e.charCodeAt(T))<128?a+=1:E<2048?a+=2:(64512&E)==55296&&(64512&e.charCodeAt(T+1))==56320?(++T,a+=4):a+=3;return a}var x="./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""),o=[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,1,54,55,56,57,58,59,60,61,62,63,-1,-1,-1,-1,-1,-1,-1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,-1,-1,-1,-1,-1,-1,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,-1,-1,-1,-1,-1];function n(e,a){var E,T,t=0,d=[];if(a<=0||a>e.length)throw Error("Illegal len: "+a);for(;t<a;){if(E=255&e[t++],d.push(x[E>>2&63]),E=(3&E)<<4,t>=a||(E|=(T=255&e[t++])>>4&15,d.push(x[63&E]),E=(15&T)<<2,t>=a)){d.push(x[63&E]);break}E|=(T=255&e[t++])>>6&3,d.push(x[63&E]),d.push(x[63&T])}return d.join("")}function f(e,a){var E,T,t,d,i,c=0,r=e.length,s=0,x=[];if(a<=0)throw Error("Illegal len: "+a);for(;c<r-1&&s<a&&(E=(i=e.charCodeAt(c++))<o.length?o[i]:-1,T=(i=e.charCodeAt(c++))<o.length?o[i]:-1,-1!=E&&-1!=T)&&(d=E<<2>>>0|(48&T)>>4,x.push(String.fromCharCode(d)),!(++s>=a||c>=r||-1==(t=(i=e.charCodeAt(c++))<o.length?o[i]:-1)||(d=(15&T)<<4>>>0|(60&t)>>2,x.push(String.fromCharCode(d)),++s>=a||c>=r)));){;d=(3&t)<<6>>>0|((i=e.charCodeAt(c++))<o.length?o[i]:-1),x.push(String.fromCharCode(d)),++s}var n=[];for(c=0;c<s;c++)n.push(x[c].charCodeAt(0));return n}var N=16,b=10,u=[0x243f6a88,0x85a308d3,0x13198a2e,0x3707344,0xa4093822,0x299f31d0,0x82efa98,0xec4e6c89,0x452821e6,0x38d01377,0xbe5466cf,0x34e90c6c,0xc0ac29b7,0xc97c50dd,0x3f84d5b5,0xb5470917,0x9216d5d9,0x8979fb1b],l=[0xd1310ba6,0x98dfb5ac,0x2ffd72db,0xd01adfb7,0xb8e1afed,0x6a267e96,0xba7c9045,0xf12c7f99,0x24a19947,0xb3916cf7,0x801f2e2,0x858efc16,0x636920d8,0x71574e69,0xa458fea3,0xf4933d7e,0xd95748f,0x728eb658,0x718bcd58,0x82154aee,0x7b54a41d,0xc25a59b5,0x9c30d539,0x2af26013,0xc5d1b023,0x286085f0,0xca417918,0xb8db38ef,0x8e79dcb0,0x603a180e,0x6c9e0e8b,0xb01e8a3e,0xd71577c1,0xbd314b27,0x78af2fda,0x55605c60,0xe65525f3,0xaa55ab94,0x57489862,0x63e81440,0x55ca396a,0x2aab10b6,0xb4cc5c34,0x1141e8ce,0xa15486af,0x7c72e993,0xb3ee1411,0x636fbc2a,0x2ba9c55d,0x741831f6,0xce5c3e16,0x9b87931e,0xafd6ba33,0x6c24cf5c,0x7a325381,0x28958677,0x3b8f4898,0x6b4bb9af,0xc4bfe81b,0x66282193,0x61d809cc,0xfb21a991,0x487cac60,0x5dec8032,0xef845d5d,0xe98575b1,0xdc262302,0xeb651b88,0x23893e81,0xd396acc5,0xf6d6ff3,0x83f44239,0x2e0b4482,0xa4842004,0x69c8f04a,0x9e1f9b5e,0x21c66842,0xf6e96c9a,0x670c9c61,0xabd388f0,0x6a51a0d2,0xd8542f68,0x960fa728,0xab5133a3,0x6eef0b6c,0x137a3be4,0xba3bf050,0x7efb2a98,0xa1f1651d,0x39af0176,0x66ca593e,0x82430e88,0x8cee8619,0x456f9fb4,0x7d84a5c3,0x3b8b5ebe,0xe06f75d8,0x85c12073,0x401a449f,0x56c16aa6,0x4ed3aa62,0x363f7706,0x1bfedf72,0x429b023d,0x37d0d724,0xd00a1248,0xdb0fead3,0x49f1c09b,0x75372c9,0x80991b7b,0x25d479d8,0xf6e8def7,0xe3fe501a,0xb6794c3b,0x976ce0bd,0x4c006ba,0xc1a94fb6,0x409f60c4,0x5e5c9ec2,0x196a2463,0x68fb6faf,0x3e6c53b5,0x1339b2eb,0x3b52ec6f,0x6dfc511f,0x9b30952c,0xcc814544,0xaf5ebd09,0xbee3d004,0xde334afd,0x660f2807,0x192e4bb3,0xc0cba857,0x45c8740f,0xd20b5f39,0xb9d3fbdb,0x5579c0bd,0x1a60320a,0xd6a100c6,0x402c7279,0x679f25fe,0xfb1fa3cc,0x8ea5e9f8,0xdb3222f8,0x3c7516df,0xfd616b15,0x2f501ec8,0xad0552ab,0x323db5fa,0xfd238760,0x53317b48,0x3e00df82,0x9e5c57bb,0xca6f8ca0,0x1a87562e,0xdf1769db,0xd542a8f6,0x287effc3,0xac6732c6,0x8c4f5573,0x695b27b0,0xbbca58c8,0xe1ffa35d,0xb8f011a0,0x10fa3d98,0xfd2183b8,0x4afcb56c,0x2dd1d35b,0x9a53e479,0xb6f84565,0xd28e49bc,0x4bfb9790,0xe1ddf2da,0xa4cb7e33,0x62fb1341,0xcee4c6e8,0xef20cada,0x36774c01,0xd07e9efe,0x2bf11fb4,0x95dbda4d,0xae909198,0xeaad8e71,0x6b93d5a0,0xd08ed1d0,0xafc725e0,0x8e3c5b2f,0x8e7594b7,0x8ff6e2fb,0xf2122b64,0x8888b812,0x900df01c,0x4fad5ea0,0x688fc31c,0xd1cff191,0xb3a8c1ad,0x2f2f2218,0xbe0e1777,0xea752dfe,0x8b021fa1,0xe5a0cc0f,0xb56f74e8,0x18acf3d6,0xce89e299,0xb4a84fe0,0xfd13e0b7,0x7cc43b81,0xd2ada8d9,0x165fa266,0x80957705,0x93cc7314,0x211a1477,0xe6ad2065,0x77b5fa86,0xc75442f5,0xfb9d35cf,0xebcdaf0c,0x7b3e89a0,0xd6411bd3,0xae1e7e49,2428461,0x2071b35e,0x226800bb,0x57b8e0af,0x2464369b,0xf009b91e,0x5563911d,0x59dfa6aa,0x78c14389,0xd95a537f,0x207d5ba2,0x2e5b9c5,0x83260376,0x6295cfa9,0x11c81968,0x4e734a41,0xb3472dca,0x7b14a94a,0x1b510052,0x9a532915,0xd60f573f,0xbc9bc6e4,0x2b60a476,0x81e67400,0x8ba6fb5,0x571be91f,0xf296ec6b,0x2a0dd915,0xb6636521,0xe7b9f9b6,0xff34052e,0xc5855664,0x53b02d5d,0xa99f8fa1,0x8ba4799,0x6e85076a,0x4b7a70e9,0xb5b32944,0xdb75092e,0xc4192623,290971e4,0x49a7df7d,0x9cee60b8,0x8fedb266,0xecaa8c71,0x699a17ff,0x5664526c,0xc2b19ee1,0x193602a5,0x75094c29,0xa0591340,0xe4183a3e,0x3f54989a,0x5b429d65,0x6b8fe4d6,0x99f73fd6,0xa1d29c07,0xefe830f5,0x4d2d38e6,0xf0255dc1,0x4cdd2086,0x8470eb26,0x6382e9c6,0x21ecc5e,0x9686b3f,0x3ebaefc9,0x3c971814,0x6b6a70a1,0x687f3584,0x52a0e286,0xb79c5305,0xaa500737,0x3e07841c,0x7fdeae5c,0x8e7d44ec,0x5716f2b8,0xb03ada37,0xf0500c0d,0xf01c1f04,0x200b3ff,0xae0cf51a,0x3cb574b2,0x25837a58,0xdc0921bd,0xd19113f9,0x7ca92ff6,0x94324773,0x22f54701,0x3ae5e581,0x37c2dadc,0xc8b57634,0x9af3dda7,0xa9446146,0xfd0030e,0xecc8c73e,0xa4751e41,0xe238cd99,0x3bea0e2f,0x3280bba1,0x183eb331,0x4e548b38,0x4f6db908,0x6f420d03,0xf60a04bf,0x2cb81290,0x24977c79,0x5679b072,0xbcaf89af,0xde9a771f,0xd9930810,0xb38bae12,0xdccf3f2e,0x5512721f,0x2e6b7124,0x501adde6,0x9f84cd87,0x7a584718,0x7408da17,0xbc9f9abc,0xe94b7d8c,0xec7aec3a,0xdb851dfa,0x63094366,0xc464c3d2,0xef1c1847,0x3215d908,0xdd433b37,0x24c2ba16,0x12a14d43,0x2a65c451,0x50940002,0x133ae4dd,0x71dff89e,0x10314e55,0x81ac77d6,0x5f11199b,0x43556f1,0xd7a3c76b,0x3c11183b,0x5924a509,0xf28fe6ed,0x97f1fbfa,0x9ebabf2c,0x1e153c6e,0x86e34570,0xeae96fb1,0x860e5e0a,0x5a3e2ab3,0x771fe71c,0x4e3d06fa,0x2965dcb9,0x99e71d0f,0x803e89d6,0x5266c825,0x2e4cc978,0x9c10b36a,0xc6150eba,0x94e2ea78,0xa5fc3c53,0x1e0a2df4,0xf2f74ea7,0x361d2b3d,0x1939260f,0x19c27960,0x5223a708,0xf71312b6,0xebadfe6e,0xeac31f66,0xe3bc4595,0xa67bc883,0xb17f37d1,0x18cff28,0xc332ddef,0xbe6c5aa5,0x65582185,0x68ab9802,0xeecea50f,0xdb2f953b,0x2aef7dad,0x5b6e2f84,0x1521b628,0x29076170,0xecdd4775,0x619f1510,0x13cca830,0xeb61bd96,0x334fe1e,0xaa0363cf,0xb5735c90,0x4c70a239,0xd59e9e0b,0xcbaade14,0xeecc86bc,0x60622ca7,0x9cab5cab,0xb2f3846e,0x648b1eaf,0x19bdf0ca,0xa02369b9,0x655abb50,0x40685a32,0x3c2ab4b3,0x319ee9d5,0xc021b8f7,0x9b540b19,0x875fa099,0x95f7997e,0x623d7da8,0xf837889a,0x97e32d77,0x11ed935f,0x16681281,0xe358829,0xc7e61fd6,0x96dedfa1,0x7858ba99,0x57f584a5,0x1b227263,0x9b83c3ff,0x1ac24696,0xcdb30aeb,0x532e3054,0x8fd948e4,0x6dbc3128,0x58ebf2ef,0x34c6ffea,0xfe28ed61,0xee7c3c73,0x5d4a14d9,0xe864b7e3,0x42105d14,0x203e13e0,0x45eee2b6,0xa3aaabea,0xdb6c4f15,0xfacb4fd0,0xc742f442,0xef6abbb5,0x654f3b1d,0x41cd2105,0xd81e799e,0x86854dc7,0xe44b476a,0x3d816250,0xcf62a1f2,0x5b8d2646,0xfc8883a0,0xc1c7b6a3,0x7f1524c3,0x69cb7492,0x47848a0b,0x5692b285,0x95bbf00,0xad19489d,0x1462b174,0x23820e00,0x58428d2a,0xc55f5ea,0x1dadf43e,0x233f7061,0x3372f092,0x8d937e41,0xd65fecf1,0x6c223bdb,0x7cde3759,0xcbee7460,0x4085f2a7,0xce77326e,0xa6078084,0x19f8509e,0xe8efd855,0x61d99735,0xa969a7aa,0xc50c06c2,0x5a04abfc,0x800bcadc,0x9e447a2e,0xc3453484,0xfdd56705,0xe1e9ec9,0xdb73dbd3,0x105588cd,0x675fda79,0xe3674340,0xc5c43465,0x713e38d8,0x3d28f89e,0xf16dff20,0x153e21e7,0x8fb03d4a,0xe6e39f2b,0xdb83adf7,0xe93d5a68,0x948140f7,0xf64c261c,0x94692934,0x411520f7,0x7602d4f7,0xbcf46b2e,0xd4a20068,0xd4082471,0x3320f46a,0x43b7d4b7,0x500061af,0x1e39f62e,0x97244546,0x14214f74,0xbf8b8840,0x4d95fc1d,0x96b591af,0x70f4ddd3,0x66a02f45,0xbfbc09ec,0x3bd9785,0x7fac6dd0,0x31cb8504,0x96eb27b3,0x55fd3941,0xda2547e6,0xabca0a9a,0x28507825,0x530429f4,0xa2c86da,0xe9b66dfb,0x68dc1462,0xd7486900,0x680ec0a4,0x27a18dee,0x4f3ffea2,0xe887ad8c,0xb58ce006,0x7af4d6b6,0xaace1e7c,0xd3375fec,0xce78a399,0x406b2a42,0x20fe9e35,0xd9f385b9,0xee39d7ab,0x3b124e8b,0x1dc9faf7,0x4b6d1856,0x26a36631,0xeae397b2,0x3a6efa74,0xdd5b4332,0x6841e7f7,0xca7820fb,0xfb0af54e,0xd8feb397,0x454056ac,0xba489527,0x55533a3a,0x20838d87,0xfe6ba9b7,0xd096954b,0x55a867bc,0xa1159a58,0xcca92963,0x99e1db33,0xa62a4a56,0x3f3125f9,0x5ef47e1c,0x9029317c,0xfdf8e802,0x4272f70,0x80bb155c,0x5282ce3,0x95c11548,0xe4c66d22,0x48c1133f,0xc70f86dc,0x7f9c9ee,0x41041f0f,0x404779a4,0x5d886e17,0x325f51eb,0xd59bc0d1,0xf2bcc18f,0x41113564,0x257b7834,0x602a9c60,0xdff8e8a3,0x1f636c1b,0xe12b4c2,0x2e1329e,0xaf664fd1,0xcad18115,0x6b2395e0,0x333e92e1,0x3b240b62,0xeebeb922,0x85b2a20e,0xe6ba0d99,0xde720c8c,0x2da2f728,0xd0127845,0x95b794fd,0x647d0862,0xe7ccf5f0,0x5449a36f,0x877d48fa,0xc39dfd27,0xf33e8d1e,0xa476341,0x992eff74,0x3a6f6eab,0xf4f8fd37,0xa812dc60,0xa1ebddf8,0x991be14c,0xdb6e6b0d,0xc67b5510,0x6d672c37,0x2765d43b,0xdcd0e804,0xf1290dc7,0xcc00ffa3,0xb5390f92,0x690fed0b,0x667b9ffb,0xcedb7d9c,0xa091cf0b,0xd9155ea3,0xbb132f88,0x515bad24,0x7b9479bf,0x763bd6eb,0x37392eb3,0xcc115979,0x8026e297,0xf42e312d,0x6842ada7,0xc66a2b3b,0x12754ccc,0x782ef11c,0x6a124237,0xb79251e7,0x6a1bbe6,0x4bfb6350,0x1a6b1018,0x11caedfa,0x3d25bdd8,0xe2e1c3c9,0x44421659,0xa121386,0xd90cec6e,0xd5abea2a,0x64af674e,0xda86a85f,0xbebfe988,0x64e4c3fe,0x9dbc8057,0xf0f7c086,0x60787bf8,0x6003604d,0xd1fd8346,0xf6381fb0,0x7745ae04,0xd736fccc,0x83426b33,0xf01eab71,0xb0804187,0x3c005e5f,0x77a057be,0xbde8ae24,0x55464299,0xbf582e61,0x4e58f48f,0xf2ddfda2,0xf474ef38,0x8789bdc2,0x5366f9c3,0xc8b38e74,0xb475f255,0x46fcd9b9,0x7aeb2661,0x8b1ddf84,0x846a0e79,0x915f95e2,0x466e598e,0x20b45770,0x8cd55591,0xc902de4c,0xb90bace1,0xbb8205d0,0x11a86248,0x7574a99e,0xb77f19b6,0xe0a9dc09,0x662d09a1,0xc4324633,0xe85a1f02,0x9f0be8c,0x4a99a025,0x1d6efe10,0x1ab93d1d,0xba5a4df,0xa186f20f,0x2868f169,0xdcb7da83,0x573906fe,0xa1e2ce9b,0x4fcd7f52,0x50115e01,0xa70683fa,0xa002b5c4,0xde6d027,0x9af88c27,0x773f8641,0xc3604c06,0x61a806b5,0xf0177a28,0xc0f586e0,6314154,0x30dc7d62,0x11e69ed7,0x2338ea63,0x53c2dd94,0xc2c21634,0xbbcbee56,0x90bcb6de,0xebfc7da1,0xce591d76,0x6f05e409,0x4b7c0188,0x39720a3d,0x7c927c24,0x86e3725f,0x724d9db9,0x1ac15bb4,0xd39eb8fc,0xed545578,0x8fca5b5,0xd83d7cd3,0x4dad0fc4,0x1e50ef5e,0xb161e6f8,0xa28514d9,0x6c51133c,0x6fd5c7e7,0x56e14ec4,0x362abfce,0xddc6c837,0xd79a3234,0x92638212,0x670efa8e,0x406000e0,0x3a39ce37,0xd3faf5cf,0xabc27737,0x5ac52d1b,0x5cb0679e,0x4fa33742,0xd3822740,0x99bc9bbe,0xd5118e9d,0xbf0f7315,0xd62d1c7e,0xc700c47b,0xb78c1b6b,0x21a19045,0xb26eb1be,0x6a366eb4,0x5748ab2f,0xbc946e79,0xc6a376d2,0x6549c2c8,0x530ff8ee,0x468dde7d,0xd5730a1d,0x4cd04dc6,0x2939bbdb,0xa9ba4650,0xac9526e8,0xbe5ee304,0xa1fad5f0,0x6a2d519a,0x63ef8ce2,0x9a86ee22,0xc089c2b8,0x43242ef6,0xa51e03aa,0x9cf2d0a4,0x83c061ba,0x9be96a4d,0x8fe51550,0xba645bd6,0x2826a2f9,0xa73a3ae1,0x4ba99586,0xef5562e9,0xc72fefd3,0xf752f7da,0x3f046f69,0x77fa0a59,0x80e4a915,0x87b08601,0x9b09e6ad,0x3b3ee593,0xe990fd5a,0x9e34d797,0x2cf0b7d9,0x22b8b51,0x96d5ac3a,0x17da67d,0xd1cf3ed6,0x7c7d2d28,0x1f9f25cf,0xadf2b89b,0x5ad6b472,0x5a88f54c,0xe029ac71,0xe019a5e6,0x47b0acfd,0xed93fa9b,0xe8d3c48d,0x283b57cc,0xf8d56629,0x79132e28,0x785f0191,0xed756055,0xf7960e44,0xe3d35e8c,0x15056dd4,0x88f46dba,0x3a16125,0x564f0bd,0xc3eb9e15,0x3c9057a2,0x97271aec,0xa93a072a,0x1b3f6d9b,0x1e6321f5,0xf59c66fb,0x26dcf319,0x7533d928,0xb155fdf5,0x3563482,0x8aba3cbb,0x28517711,0xc20ad9f8,0xabcc5167,0xccad925f,0x4de81751,0x3830dc8e,0x379d5862,0x9320f991,0xea7a90c2,0xfb3e7bce,0x5121ce64,0x774fbe32,0xa8b6e37e,0xc3293d46,0x48de5369,0x6413e680,0xa2ae0810,0xdd6db224,0x69852dfd,0x9072166,0xb39a460a,0x6445c0dd,0x586cdecf,0x1c20c8ae,0x5bbef7dd,0x1b588d40,0xccd2017f,0x6bb4e3bb,0xdda26a7e,0x3a59ff45,0x3e350a44,0xbcb4cdd5,0x72eacea8,0xfa6484bb,0x8d6612ae,0xbf3c6f47,0xd29be463,0x542f5d9e,0xaec2771b,0xf64e6370,0x740e0d8d,0xe75b1357,0xf8721671,0xaf537d5d,0x4040cb08,0x4eb4e2cc,0x34d2466a,0x115af84,3786409e3,0x95983a1d,0x6b89fb4,0xce6ea048,0x6f3f3b82,0x3520ab82,0x11a1d4b,0x277227f8,0x611560b1,0xe7933fdc,0xbb3a792b,0x344525bd,0xa08839e1,0x51ce794b,0x2f32c9b7,0xa01fbac9,0xe01cc87e,0xbcc7d1f6,0xcf0111c3,0xa1e8aac7,0x1a908749,0xd44fbd9a,0xd0dadecb,0xd50ada38,0x339c32a,0xc6913667,0x8df9317c,0xe0b12b4f,0xf79e59b7,0x43f5bb3a,0xf2d519ff,0x27d9459c,0xbf97222c,0x15e6fc2a,0xf91fc71,0x9b941525,0xfae59361,0xceb69ceb,0xc2a86459,0x12baa8d1,0xb6c1075e,0xe3056a0c,0x10d25065,0xcb03a442,0xe0ec6e0e,0x1698db3b,0x4c98a0be,0x3278e964,0x9f1f9532,0xe0d392df,0xd3a0342b,0x8971f21e,0x1b0a7441,0x4ba3348c,0xc5be7120,0xc37632d8,0xdf359f8d,0x9b992f2e,0xe60b6f47,0xfe3f11d,0xe54cda54,0x1edad891,0xce6279cf,0xcd3e7e6f,0x1618b166,0xfd2c1d05,0x848fd2c5,0xf6fb2299,0xf523f357,0xa6327623,0x93a83531,0x56cccd02,0xacf08162,0x5a75ebb5,0x6e163697,0x88d273cc,0xde966292,0x81b949d0,0x4c50901b,0x71c65614,0xe6c6c7bd,0x327a140a,0x45e1d006,0xc3f27b9a,0xc9aa53fd,0x62a80f00,0xbb25bfe2,0x35bdd2f6,0x71126905,0xb2040222,0xb6cbcf7c,0xcd769c2b,0x53113ec0,0x1640e3d3,0x38abbd60,0x2547adf0,0xba38209c,0xf746ce76,0x77afa1c5,0x20756060,0x85cbfe4e,0x8ae88dd8,0x7aaaf9b0,0x4cf9aa7e,0x1948c25c,0x2fb8a8c,0x1c36ae4,0xd6ebe1f9,0x90d4f869,0xa65cdea0,0x3f09252d,0xc208e69f,0xb74e6132,0xce77e25b,0x578fdfe3,0x3ac372e6],L=[0x4f727068,0x65616e42,0x65686f6c,0x64657253,0x63727944,0x6f756274];function A(e,a,E,T){var t=e[a],d=e[a+1];return t^=E[0],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[1],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[2],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[3],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[4],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[5],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[6],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[7],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[8],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[9],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[10],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[11],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[12],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[13],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[14],d^=(T[t>>>24]+T[256|t>>16&255]^T[512|t>>8&255])+T[768|255&t]^E[15],t^=(T[d>>>24]+T[256|d>>16&255]^T[512|d>>8&255])+T[768|255&d]^E[16],e[a]=d^E[17],e[a+1]=t,e}function I(e,a){for(var E=0,T=0;E<4;++E)T=T<<8|255&e[a],a=(a+1)%e.length;return{key:T,offp:a}}function _(e,a,E){for(var T,t=0,d=[0,0],i=a.length,c=E.length,r=0;r<i;r++)t=(T=I(e,t)).offp,a[r]=a[r]^T.key;for(r=0;r<i;r+=2)d=A(d,0,a,E),a[r]=d[0],a[r+1]=d[1];for(r=0;r<c;r+=2)d=A(d,0,a,E),E[r]=d[0],E[r+1]=d[1]}function R(e,a,E,T,t){var d,i,c=L.slice(),s=c.length;if(E<4||E>31){if(i=Error("Illegal number of rounds (4-31): "+E),T)return void r(T.bind(this,i));throw i}if(a.length!==N){if(i=Error("Illegal salt length: "+a.length+" != "+N),T)return void r(T.bind(this,i));throw i}E=1<<E>>>0;var x,o,n,f=0;function b(){if(t&&t(f/E),f<E)for(var d=Date.now();f<E&&(f+=1,_(e,x,o),_(a,x,o),!(Date.now()-d>100)););else{for(f=0;f<64;f++)for(n=0;n<s>>1;n++)A(c,n<<1,x,o);var i=[];for(f=0;f<s;f++)i.push((c[f]>>24&255)>>>0),i.push((c[f]>>16&255)>>>0),i.push((c[f]>>8&255)>>>0),i.push((255&c[f])>>>0);return T?void T(null,i):i}T&&r(b)}if("function"==typeof Int32Array?(x=new Int32Array(u),o=new Int32Array(l)):(x=u.slice(),o=l.slice()),!function(e,a,E,T){for(var t,d=0,i=[0,0],c=E.length,r=T.length,s=0;s<c;s++)d=(t=I(a,d)).offp,E[s]=E[s]^t.key;for(s=0,d=0;s<c;s+=2)d=(t=I(e,d)).offp,i[0]^=t.key,d=(t=I(e,d)).offp,i[1]^=t.key,i=A(i,0,E,T),E[s]=i[0],E[s+1]=i[1];for(s=0;s<r;s+=2)d=(t=I(e,d)).offp,i[0]^=t.key,d=(t=I(e,d)).offp,i[1]^=t.key,i=A(i,0,E,T),T[s]=i[0],T[s+1]=i[1]}(a,e,x,o),void 0!==T)b();else for(;;)if(void 0!==(d=b()))return d||[]}function O(e,a,E,T){if("string"!=typeof e||"string"!=typeof a){if(t=Error("Invalid string / salt: Not a string"),E)return void r(E.bind(this,t));throw t}if("$"!==a.charAt(0)||"2"!==a.charAt(1)){if(t=Error("Invalid salt version: "+a.substring(0,2)),E)return void r(E.bind(this,t));throw t}if("$"===a.charAt(2))d="\0",i=3;else{if("a"!==(d=a.charAt(2))&&"b"!==d&&"y"!==d||"$"!==a.charAt(3)){if(t=Error("Invalid salt revision: "+a.substring(2,4)),E)return void r(E.bind(this,t));throw t}i=4}if(a.charAt(i+2)>"$"){if(t=Error("Missing salt rounds"),E)return void r(E.bind(this,t));throw t}var t,d,i,c=10*parseInt(a.substring(i,i+1),10)+parseInt(a.substring(i+1,i+2),10),x=a.substring(i+3,i+25),o=function(e){for(var a,E,T=0,t=Array(s(e)),d=0,i=e.length;d<i;++d)(a=e.charCodeAt(d))<128?t[T++]=a:(a<2048?t[T++]=a>>6|192:((64512&a)==55296&&(64512&(E=e.charCodeAt(d+1)))==56320?(a=65536+((1023&a)<<10)+(1023&E),++d,t[T++]=a>>18|240,t[T++]=a>>12&63|128):t[T++]=a>>12|224,t[T++]=a>>6&63|128),t[T++]=63&a|128);return t}(e+=d>="a"?"\0":""),b=f(x,N);function u(e){var a=[];return a.push("$2"),d>="a"&&a.push(d),a.push("$"),c<10&&a.push("0"),a.push(c.toString()),a.push("$"),a.push(n(b,b.length)),a.push(n(e,4*L.length-1)),a.join("")}if(void 0===E)return u(R(o,b,c));R(o,b,c,function(e,a){e?E(e,null):E(null,u(a))},T)}e.s(["default",0,{setRandomFallback:function(e){E=e},genSaltSync:T,genSalt:t,hashSync:d,hash:i,compareSync:function(e,a){if("string"!=typeof e||"string"!=typeof a)throw Error("Illegal arguments: "+typeof e+", "+typeof a);return 60===a.length&&c(d(e,a.substring(0,a.length-31)),a)},compare:function(e,a,E,T){function t(E){"string"!=typeof e||"string"!=typeof a?r(E.bind(this,Error("Illegal arguments: "+typeof e+", "+typeof a))):60!==a.length?r(E.bind(this,null,!1)):i(e,a.substring(0,29),function(e,T){e?E(e):E(null,c(T,a))},T)}if(!E)return new Promise(function(e,a){t(function(E,T){E?a(E):e(T)})});if("function"!=typeof E)throw Error("Illegal callback: "+typeof E);t(E)},getRounds:function(e){if("string"!=typeof e)throw Error("Illegal arguments: "+typeof e);return parseInt(e.split("$")[2],10)},getSalt:function(e){if("string"!=typeof e)throw Error("Illegal arguments: "+typeof e);if(60!==e.length)throw Error("Illegal hash length: "+e.length+" != 60");return e.substring(0,29)},truncates:function(e){if("string"!=typeof e)throw Error("Illegal arguments: "+typeof e);return s(e)>72},encodeBase64:function(e,a){return n(e,a)},decodeBase64:function(e,a){return f(e,a)}}])},273396,e=>e.a(async(a,E)=>{try{var T=e.i(723862),t=a([T]);[T]=t.then?(await t)():t;let i=new T.Pool({connectionString:process.env.DATABASE_URL||"postgresql://f1news:f1news_secret_2024@localhost:5432/f1news",max:20,idleTimeoutMillis:3e4,connectionTimeoutMillis:5e3});function d(e,a){if(!a||0===a.length)return{text:e,values:[]};let E=0,T=e.replace(/\?/g,()=>(E++,`$${E}`)),t=[],d=0;return{text:T.replace(/\$(\d+)(?:\s*::\s*\w+(?:\([^)]*\))?)?(\s+IS\s+(?:NOT\s+)?NULL(?=[\s)]|$))?/gi,(e,E,T)=>{let i=a[++d-1];return T?null==i?T.toUpperCase().includes("NOT ")?"FALSE":"TRUE":T.toUpperCase().includes("NOT ")?"TRUE":"FALSE":null==i?"NULL":(t.push(i),`$${t.length}`)}),values:t}}let c=null;e.s(["getDb",0,function(){let e;return c||(c={query:e=async(e,a)=>{let{text:E,values:T}=d(e,a);try{let e=await i.query(E,T);return{rows:e.rows,rowCount:e.rowCount}}catch(t){throw t?.code==="42P18"&&(console.error("[pg 42P18] SQL:",e.slice(0,500)),console.error("[pg 42P18] Params:",a),console.error("[pg 42P18] Built text:",E.slice(0,500)),console.error("[pg 42P18] Built values:",T)),t}},get:async(a,E)=>(await e(a,E)).rows[0],all:async(a,E)=>(await e(a,E)).rows,run:async(a,E)=>({rowCount:(await e(a,E)).rowCount}),transaction:async e=>{let a=await i.connect();try{await a.query("BEGIN");let E=await e(function e(a){let E=async(e,E)=>{let{text:T,values:t}=d(e,E),i=await a.query(T,t);return{rows:i.rows,rowCount:i.rowCount}};return{query:E,get:async(e,a)=>(await E(e,a)).rows[0],all:async(e,a)=>(await E(e,a)).rows,run:async(e,a)=>({rowCount:(await E(e,a)).rowCount}),transaction:async E=>{await a.query("BEGIN");try{let T=await E(e(a));return await a.query("COMMIT"),T}catch(e){throw await a.query("ROLLBACK"),e}}}}(a));return await a.query("COMMIT"),E}catch(e){throw await a.query("ROLLBACK"),e}finally{a.release()}}}),c},"getPool",0,function(){return i}]),E()}catch(e){E(e)}},!1),530298,e=>e.a(async(a,E)=>{try{var T=e.i(273396),t=a([T]);async function d(){let e=(0,T.getPool)(),a=await e.connect();try{await a.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        team TEXT,
        driver TEXT,
        karma INTEGER DEFAULT 0,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        cover TEXT,
        bio TEXT,
        display_name TEXT,
        avatar_color TEXT,
        onboarded INTEGER DEFAULT 0,
        banned INTEGER DEFAULT 0,
        is_online INTEGER DEFAULT 0,
        last_seen_at TIMESTAMPTZ,
        email_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        reset_token TEXT,
        reset_expires TIMESTAMPTZ,
        hide_team INTEGER DEFAULT 0,
        hide_driver INTEGER DEFAULT 0,
        hide_leaderboard INTEGER DEFAULT 0,
        notif_comments INTEGER DEFAULT 1,
        notif_upvotes INTEGER DEFAULT 1,
        notif_mentions INTEGER DEFAULT 1,
        notif_fantasy INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        tag TEXT,
        image TEXT,
        community_author_id TEXT,
        owner_pinned_at TIMESTAMPTZ,
        feed_pinned_at TIMESTAMPTZ,
        anonymous INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        direction INTEGER NOT NULL CHECK (direction IN (1, -1)),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comment_votes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        direction INTEGER NOT NULL CHECK (direction IN (1, -1)),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, comment_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        pool TEXT DEFAULT '0',
        ends_at TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        deleted INTEGER DEFAULT 0,
        options TEXT,
        correct_answer TEXT,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fantasy_bets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        event_id TEXT NOT NULL REFERENCES fantasy_events(id) ON DELETE CASCADE,
        prediction TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_rounds (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        round INTEGER NOT NULL,
        name TEXT NOT NULL,
        circuit TEXT,
        country TEXT,
        deadline TEXT NOT NULL,
        questions TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        UNIQUE(season, round)
      );

      CREATE TABLE IF NOT EXISTS fantasy_entries (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        breakdown TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(round_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS standings_drivers (
        pos INTEGER PRIMARY KEY,
        driver TEXT NOT NULL,
        team TEXT NOT NULL,
        color TEXT NOT NULL,
        pts INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS standings_constructors (
        pos INTEGER PRIMARY KEY,
        team TEXT NOT NULL,
        color TEXT NOT NULL,
        pts INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS flairs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_flairs (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flair_id TEXT NOT NULL REFERENCES flairs(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, flair_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        actor_id TEXT NOT NULL REFERENCES users(id),
        post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
        comment_id TEXT,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, achievement_id)
      );

      CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        race_name TEXT NOT NULL,
        url TEXT NOT NULL,
        embed_url TEXT,
        active INTEGER DEFAULT 0,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS live_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_key INTEGER,
        content TEXT NOT NULL,
        deleted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS communities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        avatar TEXT,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS community_posts (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        PRIMARY KEY (community_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS community_subscriptions (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (community_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS community_moderators (
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'editor',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (community_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS community_submissions (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        image TEXT,
        tags TEXT,
        as_community INTEGER DEFAULT 1,
        anonymous INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS post_media (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        type TEXT DEFAULT 'image',
        position INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS post_tags (
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        PRIMARY KEY (post_id, tag)
      );

      CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (follower_id, followed_id)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
        comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
        target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'open',
        resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        resolution TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS email_codes (
        email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (email, purpose)
      );

      CREATE TABLE IF NOT EXISTS feed_signals (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, type, value)
      );

      CREATE TABLE IF NOT EXISTS feed_seen (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        seen_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        visitor_id TEXT,
        session_id TEXT,
        user_id TEXT,
        type TEXT NOT NULL,
        path TEXT,
        referrer TEXT,
        device TEXT,
        data TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dm_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT DEFAULT '',
        image TEXT,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fantasy_assets (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        kind TEXT NOT NULL,
        ref TEXT NOT NULL,
        name TEXT NOT NULL,
        team TEXT,
        color TEXT,
        price REAL NOT NULL DEFAULT 0,
        price_delta REAL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        form REAL NOT NULL DEFAULT 0,
        image TEXT,
        image_credit TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(season, kind, ref)
      );

      CREATE TABLE IF NOT EXISTS fantasy_squads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        season INTEGER NOT NULL,
        name TEXT,
        budget REAL NOT NULL DEFAULT 100,
        total_points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, season)
      );

      CREATE TABLE IF NOT EXISTS fantasy_lineups (
        id TEXT PRIMARY KEY,
        squad_id TEXT NOT NULL REFERENCES fantasy_squads(id) ON DELETE CASCADE,
        round_id TEXT NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
        picks TEXT NOT NULL,
        captain TEXT,
        chip TEXT,
        transfers INTEGER NOT NULL DEFAULT 0,
        penalty INTEGER NOT NULL DEFAULT 0,
        points INTEGER DEFAULT 0,
        breakdown TEXT,
        locked INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(squad_id, round_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_asset_scores (
        asset_id TEXT NOT NULL REFERENCES fantasy_assets(id) ON DELETE CASCADE,
        round_id TEXT NOT NULL REFERENCES fantasy_rounds(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0,
        breakdown TEXT,
        PRIMARY KEY (asset_id, round_id)
      );

      CREATE TABLE IF NOT EXISTS fantasy_leagues (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fantasy_league_members (
        league_id TEXT NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (league_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS f1_meetings (
        meeting_key INTEGER PRIMARY KEY,
        jolpica_season INTEGER,
        jolpica_round INTEGER,
        name TEXT,
        circuit TEXT,
        country TEXT,
        starts_at TEXT,
        source_payload TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_sessions (
        session_key INTEGER PRIMARY KEY,
        meeting_key INTEGER,
        name TEXT,
        type TEXT,
        starts_at TEXT,
        ends_at TEXT,
        status TEXT,
        source_payload TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_driver_map (
        id TEXT PRIMARY KEY,
        jolpica_driver_id TEXT,
        jolpica_code TEXT,
        openf1_driver_number INTEGER,
        full_name TEXT,
        team TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_constructor_map (
        id TEXT PRIMARY KEY,
        jolpica_constructor_id TEXT,
        openf1_team_name TEXT,
        display_name TEXT,
        color TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_live_snapshots (
        id TEXT PRIMARY KEY,
        session_key INTEGER,
        mode TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_laps (
        session_key INTEGER NOT NULL,
        driver_number INTEGER NOT NULL,
        lap_number INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (session_key, driver_number, lap_number)
      );

      CREATE TABLE IF NOT EXISTS f1_pit_stops (
        id TEXT PRIMARY KEY,
        session_key INTEGER NOT NULL,
        driver_number INTEGER NOT NULL,
        lap_number INTEGER,
        payload TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_race_control (
        id TEXT PRIMARY KEY,
        session_key INTEGER NOT NULL,
        driver_number INTEGER,
        lap_number INTEGER,
        message TEXT,
        payload TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS f1_weather_samples (
        session_key INTEGER NOT NULL,
        sampled_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (session_key, sampled_at)
      );

      CREATE TABLE IF NOT EXISTS f1_telemetry_samples (
        session_key INTEGER NOT NULL,
        driver_number INTEGER NOT NULL,
        sampled_at TEXT NOT NULL,
        speed REAL,
        throttle REAL,
        brake REAL,
        gear INTEGER,
        rpm INTEGER,
        drs INTEGER,
        payload TEXT,
        PRIMARY KEY (session_key, driver_number, sampled_at)
      );
    `),await a.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
      CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_active ON fantasy_events(active);
      CREATE INDEX IF NOT EXISTS idx_fantasy_rounds_season ON fantasy_rounds(season, round);
      CREATE INDEX IF NOT EXISTS idx_fantasy_entries_user ON fantasy_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_entries_round ON fantasy_entries(round_id);
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
      CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_community_subscriptions_user ON community_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_moderators_user ON community_moderators(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id);
      CREATE INDEX IF NOT EXISTS idx_community_submissions_status ON community_submissions(community_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_live_chat_session ON live_chat_messages(session_key, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id);
      CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id);
      CREATE INDEX IF NOT EXISTS idx_f1_sessions_meeting ON f1_sessions(meeting_key);
      CREATE INDEX IF NOT EXISTS idx_f1_live_session ON f1_live_snapshots(session_key, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_f1_telemetry_driver ON f1_telemetry_samples(session_key, driver_number, sampled_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feed_signals_user ON feed_signals(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_feed_seen_user ON feed_seen(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_dm_recipient ON dm_messages(recipient_id, read);
      CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(sender_id, recipient_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_dm_created ON dm_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_fantasy_assets_season ON fantasy_assets(season, kind);
      CREATE INDEX IF NOT EXISTS idx_fantasy_squads_season ON fantasy_squads(season, total_points DESC);
      CREATE INDEX IF NOT EXISTS idx_fantasy_lineups_round ON fantasy_lineups(round_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_asset_scores_round ON fantasy_asset_scores(round_id);
      CREATE INDEX IF NOT EXISTS idx_fantasy_league_members_user ON fantasy_league_members(user_id);
    `),await a.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS fts TSVECTOR;
      CREATE INDEX IF NOT EXISTS idx_posts_fts ON posts USING GIN(fts);
    `),await a.query(`
      CREATE OR REPLACE FUNCTION posts_fts_update() RETURNS TRIGGER AS $$
      BEGIN
        NEW.fts := to_tsvector('russian', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS posts_fts_trigger ON posts;
      CREATE TRIGGER posts_fts_trigger
        BEFORE INSERT OR UPDATE ON posts
        FOR EACH ROW EXECUTE FUNCTION posts_fts_update();
    `),console.log("[pg] Schema migration complete")}finally{a.release()}}[T]=t.then?(await t)():t,e.s(["migratePgSchema",0,d]),E()}catch(e){E(e)}},!1),274818,e=>e.a(async(a,E)=>{try{var T=e.i(995031),t=e.i(203422),d=e.i(522734),i=e.i(814747),c=e.i(254799),r=e.i(273396),s=e.i(530298),x=a([r,s]);[r,s]=x.then?(await x)():x;let A=!1;async function o(){if(A)return;await (0,s.migratePgSchema)();let e=(0,r.getDb)();await N(e),await n(e),await f(e),A=!0}async function n(a){if(!await a.get("SELECT value FROM app_meta WHERE key = ?",["ach_backfill_v1"])){for(let E of(await a.all("SELECT id FROM users")))try{let{checkAndGrantAchievements:T}=await e.A(848226);await T(a,E.id)}catch{}await a.run("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",["ach_backfill_v1","1"])}}async function f(e){let a=await e.all("SELECT id, avatar, cover FROM users WHERE avatar LIKE ? OR cover LIKE ?",["data:image/%","data:image/%"]);if(!a.length)return;let E=i.default.join(process.cwd(),"public","uploads");d.default.existsSync(E)||d.default.mkdirSync(E,{recursive:!0});let T=(e,a,T)=>{if(!T?.startsWith("data:image/"))return null;let t=T.match(/^data:(image\/(?:jpeg|png|webp));base64,([\w+/=\s]+)$/i);if(!t)return null;let r="image/jpeg"===t[1]?"jpg":t[1].split("/")[1],s=Buffer.from(t[2].replace(/\s/g,""),"base64");if(!s.length||s.length>5242880)return null;let x=c.default.createHash("sha256").update(s).digest("hex").slice(0,16),o=`profile-${e}-${a}-${x}.${r}`,n=i.default.join(E,o);return d.default.existsSync(n)||d.default.writeFileSync(n,s),`/uploads/${o}`};for(let E of a){let a=T(E.id,"avatar",E.avatar),t=T(E.id,"cover",E.cover);(a||t)&&await e.run("UPDATE users SET avatar = COALESCE(?, avatar), cover = COALESCE(?, cover) WHERE id = ?",[a,t,E.id])}}let I=[{pos:1,driver:"NOR",team:"McLaren",color:"#ff8000",pts:131},{pos:2,driver:"VER",team:"Red Bull",color:"#1e41ff",pts:119},{pos:3,driver:"PIA",team:"McLaren",color:"#ff8000",pts:108},{pos:4,driver:"RUS",team:"Mercedes",color:"#00d2be",pts:90},{pos:5,driver:"LEC",team:"Ferrari",color:"#dc0000",pts:78},{pos:6,driver:"ANT",team:"Mercedes",color:"#00d2be",pts:62},{pos:7,driver:"HAM",team:"Ferrari",color:"#dc0000",pts:55},{pos:8,driver:"GAS",team:"Alpine",color:"#0093cc",pts:34},{pos:9,driver:"HAD",team:"Racing Bulls",color:"#6692ff",pts:30},{pos:10,driver:"ALB",team:"Williams",color:"#005aff",pts:28}],_=[{pos:1,team:"McLaren",color:"#ff8000",pts:239},{pos:2,team:"Mercedes",color:"#00d2be",pts:152},{pos:3,team:"Red Bull",color:"#1e41ff",pts:139},{pos:4,team:"Ferrari",color:"#dc0000",pts:133},{pos:5,team:"Alpine",color:"#0093cc",pts:56},{pos:6,team:"Williams",color:"#005aff",pts:44},{pos:7,team:"Racing Bulls",color:"#6692ff",pts:38},{pos:8,team:"Haas",color:"#b6babd",pts:30},{pos:9,team:"Aston Martin",color:"#006f62",pts:24},{pos:10,team:"Audi",color:"#e10600",pts:12},{pos:11,team:"Cadillac",color:"#003d7c",pts:4}];async function N(e){let a=await b(e);await l(e,a),await L(e),"1"===process.env.SEED_DEMO&&await u(e)}async function b(e){let a=await e.get("SELECT id, role FROM users WHERE email = ?",["news@paddock.local"]);if(a)return"admin"!==a.role&&await e.run("UPDATE users SET role = ? WHERE id = ?",["admin",a.id]),a.id;let E=process.env.SEED_ADMIN_PASSWORD||c.default.randomBytes(24).toString("hex");process.env.SEED_ADMIN_PASSWORD||console.warn("[seed] Created admin 'news@paddock.local' with a random password.");let d=(0,T.v4)(),i=new Date().toISOString();return await e.run("INSERT INTO users (id, username, email, password_hash, karma, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",[d,"NewsBot","news@paddock.local",t.default.hashSync(E,10),5e3,"admin",i]),d}async function u(e){if(await e.get("SELECT 1 FROM users WHERE email = ?",["tifosi@paddock.local"]))return;let a=new Date().toISOString(),E=t.default.hashSync(process.env.SEED_DEMO_PASSWORD||"demo1234",10),d=[{min:100,id:"ach-100-karma"},{min:500,id:"ach-500-karma"},{min:1e3,id:"ach-1000-karma"}];for(let t of[{id:(0,T.v4)(),user:"TifosiForever",name:"Тифози навсегда",email:"tifosi@paddock.local",team:"Ferrari",driver:"LEC",karma:1200,flairs:["flair-veteran","flair-analyst"],achs:["ach-first-post","ach-first-comment","ach-10-posts"]},{id:(0,T.v4)(),user:"MemeLord44",name:"Король мемов",email:"meme@paddock.local",team:"McLaren",driver:"NOR",karma:3400,flairs:["flair-memer"],achs:["ach-first-post","ach-10-posts","ach-50-upvotes"]},{id:(0,T.v4)(),user:"StatsGuru",name:"Гуру статистики",email:"stats@paddock.local",team:"Mercedes",driver:"RUS",karma:2100,flairs:["flair-analyst"],achs:["ach-first-post","ach-first-comment","ach-veteran"]},{id:(0,T.v4)(),user:"FantasyKing",name:"Фэнтези-король",email:"fantasy@paddock.local",team:"Red Bull",driver:"VER",karma:850,flairs:["flair-insider"],achs:["ach-first-post","ach-fantasy-win"]},{id:(0,T.v4)(),user:"HistoryBuff",name:"Знаток истории",email:"history@paddock.local",team:null,driver:"SEN",karma:1600,flairs:["flair-veteran","flair-collector"],achs:["ach-first-post","ach-veteran","ach-bookmark-5"]}]){for(let T of(await e.run("INSERT INTO users (id, username, email, password_hash, team, driver, karma, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING",[t.id,t.user,t.email,E,t.team,t.driver,t.karma,"user",a]),await e.run("UPDATE users SET display_name = ? WHERE id = ?",[t.name,t.id]),t.flairs))await e.run("INSERT INTO user_flairs (user_id, flair_id) VALUES (?, ?) ON CONFLICT DO NOTHING",[t.id,T]);for(let a of new Set([...t.achs,...d.filter(e=>t.karma>=e.min).map(e=>e.id)]))await e.run("INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?) ON CONFLICT DO NOTHING",[t.id,a])}}async function l(e,a){let E=new Date().toISOString();if(a){for(let a of[{id:"flair-veteran",name:"Ветеран",icon:"VET",color:"#c9a92c"},{id:"flair-analyst",name:"Аналитик",icon:"DATA",color:"#4da6ff"},{id:"flair-memer",name:"Мемолог",icon:"MEME",color:"#ff8000"},{id:"flair-insider",name:"Инсайдер",icon:"IN",color:"#9b8af0"},{id:"flair-artist",name:"Дизайнер",icon:"ART",color:"#e10600"},{id:"flair-collector",name:"Коллекционер",icon:"CARD",color:"#00d2be"}])await e.run("INSERT INTO flairs (id, name, icon, color) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color",[a.id,a.name,a.icon,a.color]);for(let a of[{id:"ach-first-post",name:"Первый пост",description:"Опубликовать первый пост",icon:"P1"},{id:"ach-10-posts",name:"Пит-уолл",description:"Опубликовать 10 постов",icon:"10"},{id:"ach-50-upvotes",name:"Голос паддока",description:"Получить 50 плюсов",icon:"+50"},{id:"ach-100-karma",name:"Сотня кармы",description:"Набрать 100 кармы",icon:"100"},{id:"ach-500-karma",name:"Лидер мнений",description:"Набрать 500 кармы",icon:"500"},{id:"ach-1000-karma",name:"Легенда паддока",description:"Набрать 1000 кармы",icon:"1K"},{id:"ach-first-comment",name:"Комментатор",description:"Оставить первый комментарий",icon:"C1"},{id:"ach-bookmark-5",name:"Архивариус",description:"Сохранить 5 постов",icon:"SAVE"},{id:"ach-fantasy-win",name:"Стратег",description:"Выиграть этап фэнтези",icon:"FP"},{id:"ach-veteran",name:"Старожил",description:"Первый сезон на PADDOCK",icon:"S1"}])await e.run("INSERT INTO achievements (id, name, description, icon) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon",[a.id,a.name,a.description,a.icon]);if(!await e.get("SELECT value FROM app_meta WHERE key = ?",["communities_seeded"])){if(((await e.get("SELECT COUNT(*) as c FROM communities"))?.c||0)>0)return void await e.run("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",["communities_seeded","1"]);for(let T of[{id:"hub-news",name:"Новости",slug:"novosti",description:"Подтвержденные новости F1, FIA, команд и пилотов.",icon:"N",color:"#e10600"},{id:"hub-tech",name:"Техника",slug:"tehnika",description:"Аэродинамика, моторы, шины, обновления и регламент.",icon:"T",color:"#00a99d"},{id:"hub-races",name:"Гонки",slug:"gonki",description:"Гран-при, стратегии, live-обсуждения и разборы сессий.",icon:"R",color:"#4da6ff"},{id:"hub-memes",name:"Мемы",slug:"memy",description:"Легкая сторона паддока без токсичности.",icon:"M",color:"#ff8000"},{id:"hub-fantasy",name:"Фэнтези",slug:"fentezi",description:"Прогнозы, ставки сообщества и weekend challenges.",icon:"F",color:"#9b8af0"},{id:"hub-teams",name:"Команды",slug:"komandy",description:"Обсуждение Ferrari, McLaren, Red Bull, Mercedes и остальных.",icon:"C",color:"#c9a92c"},{id:"hub-drivers",name:"Пилоты",slug:"piloty",description:"Форма, контракты, стиль пилотажа и сравнения.",icon:"D",color:"#6692ff"}])await e.run("INSERT INTO communities (id, name, slug, description, icon, color, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",[T.id,T.name,T.slug,T.description,T.icon,T.color,a,E]),await e.run("INSERT INTO community_subscriptions (community_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",[T.id,a]);for(let T of[{id:"seed-post-live-center",community:"hub-races",title:"Live Race Center: что должно быть на экране во время гонки",content:"Идеальный race thread: позиции, интервалы, круги, шины, пит-стопы, race control и быстрые реакции сообщества.",tag:"Гонка"},{id:"seed-post-openf1",community:"hub-tech",title:"OpenF1 и Jolpica: как делим источники данных",content:"Jolpica используем для календаря, standings и результатов.",tag:"Техника"},{id:"seed-post-rules",community:"hub-news",title:"Правила запуска: спойлеры, источники и уважение к участникам",content:"Помечаем спойлеры, отделяем слухи от фактов, спорим без атак.",tag:"Новость"},{id:"seed-post-fantasy",community:"hub-fantasy",title:"Прогноз уикенда: кто заберет поул и кто удивит в гонке?",content:"Формат для фэнтези: поул, подиум, прогресс, пит-стоп, safety car.",tag:"Фэнтези"},{id:"seed-post-memes",community:"hub-memes",title:"Когда инженер говорит box opposite, а ты уже проехал въезд на пит-лейн",content:"Классика командного радио.",tag:"Мем"}])await e.run("INSERT INTO posts (id, user_id, title, content, tag, community_author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",[T.id,a,T.title,T.content,T.tag,T.community,E]),await e.run("INSERT INTO community_posts (community_id, post_id) VALUES (?, ?) ON CONFLICT DO NOTHING",[T.community,T.id]);await e.run("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",["communities_seeded","1"])}}}async function L(e){let a=e||(0,r.getDb)(),E=await a.get("SELECT COUNT(*) as c FROM standings_drivers");if(!E||!(E.c>0)){for(let e of(await a.run("DELETE FROM standings_drivers"),await a.run("DELETE FROM standings_constructors"),I))await a.run("INSERT INTO standings_drivers (pos, driver, team, color, pts) VALUES (?, ?, ?, ?, ?)",[e.pos,e.driver,e.team,e.color,e.pts]);for(let e of _)await a.run("INSERT INTO standings_constructors (pos, team, color, pts) VALUES (?, ?, ?, ?)",[e.pos,e.team,e.color,e.pts])}}e.s(["initDb",0,o,"seedStandings",0,L]),E()}catch(e){E(e)}},!1),333680,e=>e.a(async(a,E)=>{try{var T=e.i(274818),t=e.i(273396),d=a([T,t]);[T,t]=d.then?(await d)():d,e.s(["initDb",()=>T.initDb]),E()}catch(e){E(e)}},!1)];

//# sourceMappingURL=_1i__cyf._.js.map