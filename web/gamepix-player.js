'use strict';
// Provider-specific allowlists keep external games isolated from the portal.
(() => {
 const providers={
  gamepix:{name:'GamePix',hosts:['play.gamepix.com'],sid:'5005N'},
  gamemonetize:{name:'GameMonetize',hosts:['html5.gamemonetize.co','html5.gamemonetize.com']}
 };
 function player(ctx){
  const game=ctx.game,provider=providers[game.engine];let url;
  try{url=new URL(game.url)}catch{}
  if(!provider||!url||url.protocol!=='https:'||!provider.hosts.includes(url.hostname)||(provider.sid&&url.searchParams.get('sid')!==provider.sid)){
   ctx.status('This game link is not configured for this arcade.');return {destroy(){ctx.area.replaceChildren()}};
  }
  let alive=true;
  const frame=document.createElement('iframe');frame.className='gamepix-frame'+(game.orientation==='portrait'?' portrait':'');
  frame.title=game.title+' — '+provider.name;frame.allow='autoplay; fullscreen; gamepad; accelerometer; gyroscope';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-orientation-lock allow-popups allow-popups-to-escape-sandbox');
  const fallback=document.createElement('p');fallback.className='embed-help';fallback.append('Game not starting? Use Reload game or ');
  const link=document.createElement('a');link.href=game.url;link.target='_blank';link.rel='noopener';link.textContent='open it in a new tab ↗';fallback.append(link);
  const timeout=setTimeout(()=>{if(alive)ctx.status('Taking a little longer? Try Reload game or the link below.')},20000);
  frame.addEventListener('load',()=>{clearTimeout(timeout);if(alive)ctx.status('Use the game’s own controls. Ads and saves are managed by '+provider.name+' and the game developer.')});
  frame.addEventListener('error',()=>{clearTimeout(timeout);if(alive)ctx.status('Could not reach this game. Try Reload game or open it in a new tab.')});
  frame.src=game.url;ctx.area.classList.add('external-play-area');ctx.area.append(frame,fallback);ctx.status('Connecting to '+provider.name+'…');
  return {destroy(){alive=false;clearTimeout(timeout);frame.remove();ctx.area.classList.remove('external-play-area');ctx.area.replaceChildren()}};
 }
 window.PlaynovaGames.gamepix=player;window.PlaynovaGames.gamemonetize=player;
})();
