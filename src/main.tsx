import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, CircleAlert, Eye, Fingerprint, GripVertical, Lock, ShieldAlert, ShieldCheck, Terminal, Timer, X } from 'lucide-react';
import './styles.css';

type Phase = 'intro' | 'briefing' | 'challenge' | 'maze' | 'reveal' | 'complete';
type Feedback = 'idle' | 'correct' | 'wrong';
type Choice = { id: string; label: string };
type Challenge = {
  id: number;
  code: string;
  type: 'choice' | 'memory' | 'sequence' | 'emoji' | 'blur' | 'hidden' | 'drag' | 'tiles' | 'intruder' | 'person' | 'text';
  eyebrow: string;
  title: string;
  description: string;
  choices?: Choice[];
  answer?: string;
};

const challenges: Challenge[] = [
  { id: 1, code: 'GÖZLEM_01', type: 'choice', eyebrow: 'Görsel analiz', title: 'Farklı olan sembolü bul.', description: 'Aşağıdaki dizilerden yalnızca birinde farklı bir sembol var.', choices: [{id:'a',label:'◇ ◇ ◇ ◇ ◇'},{id:'b',label:'◇ ◇ ◆ ◇ ◇'},{id:'c',label:'◇ ◇ ◇ ◇ ◇'}], answer:'b' },
  { id: 2, code: 'HAFIZA_02', type: 'memory', eyebrow: 'Kısa süreli hafıza', title: 'Dört rakamı aklında tut.', description: 'Dizi 3 saniye gösterilecek. Gizlendiğinde doğru seçeneğe dokun.', choices: [{id:'a',label:'7 — 2 — 9 — 4'},{id:'b',label:'7 — 9 — 2 — 4'},{id:'c',label:'2 — 7 — 9 — 4'}], answer:'a' },
  { id: 3, code: 'DÜZEN_03', type: 'sequence', eyebrow: 'Basit mantık', title: 'Eksik sayıyı tamamla.', description: '2, 4, 6, 8, ? dizisinde sıradaki sayı nedir?', choices: [{id:'a',label:'9'},{id:'b',label:'10'},{id:'c',label:'12'}], answer:'b' },
  { id: 4, code: 'EMOJİ_04', type: 'emoji', eyebrow: 'Emoji bulmacası', title: 'Emojilerin anlattığı programı bul.', description: 'İki ipucunu birleştir ve doğru cevabı seç.', choices: [{id:'a',label:'💍 + 🏠 = Kısmetse Olur'},{id:'b',label:'❤️ + 🚪 = Aşk Kapısı'},{id:'c',label:'👁️ + 📺 = İzleyici Evi'}], answer:'a' },
  { id: 5, code: 'SİLUET_05', type: 'blur', eyebrow: 'Görsel bulmaca', title: 'Bulanık nesneyi tanı.', description: 'Görüntüdeki nesne hangisi?', choices: [{id:'a',label:'Gül'},{id:'b',label:'Yüzük'},{id:'c',label:'Anahtar'}], answer:'c' },
  { id: 6, code: 'KARAKTER_06', type: 'person', eyebrow: 'Kısmetse Olur 2026', title: 'Bu kim?', description: 'İnternetteki ipucu bağlantısını aç, kişiyi bul ve doğru ismi seç.', choices: [{id:'a',label:'Aleyna Özgün'},{id:'b',label:'Ceren Topkara'},{id:'c',label:'Selin Ünal'}], answer:'a' },
  { id: 7, code: 'EŞLEŞME_07', type: 'drag', eyebrow: 'Basit sıralama', title: 'Parçaları küçükten büyüğe sırala.', description: 'Üç sayı kartını doğru sıraya getir.', answer:'done' },
  { id: 8, code: 'KİLİT_08', type: 'tiles', eyebrow: 'Mini kilit oyunu', title: 'Üç parçalı kilidi aç.', description: 'Parçalara dokunarak anahtar desenini oluştur: ● ▲ ■', answer:'done' },
  { id: 9, code: 'KARAR_09', type: 'choice', eyebrow: 'Arkadaşlık sorusu', title: 'Azra kaşar mı ? .', description: 'Arkadaşımız Azra için aşağıdaki ifadelerden hangisi doğrudur?', choices: [{id:'a',label:'kaşarın önde gideni'},{id:'b',label:'çok edepli ve namuslu'}], answer:'a' },
  { id: 10, code: 'SON_EŞİK', type: 'choice', eyebrow: 'Son karar', title: 'Bir arkadaş baskı altında kalırsa ne yaparsın?', description: 'Azra veya başka biri istemediği bir durumda kalırsa doğru yaklaşım hangisidir?', choices: [{id:'a',label:'Sınırlarına saygı duyar ve güvende olmasına yardım ederim.'},{id:'b',label:'Kalabalığın baskısına katılırım.'}], answer:'a' },
  { id: 11, code: 'BAĞ_11', type: 'text', eyebrow: 'Özel tarih', title: "Eliza ve Never'ın sevgili olduğu tarihi yaz.", description: 'Tarihi gün.ay.yıl formatında eksiksiz gir.', answer:'24.05.2026' },
];

const fragments = ['NX-731', 'KANAL KAPALI', '0x6A', 'İZLENİYOR', 'PUZZLE: 96%', 'NEVER_NODE', 'ŞİFRELİ'];

let sharedAudioContext: AudioContext | null = null;
function playClickSound(target:EventTarget|null) {
  if(!(target instanceof Element)||!target.closest('button'))return;
  const AudioContextClass=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioContextClass)return;
  const context=sharedAudioContext??=new AudioContextClass();
  if(context.state==='suspended')void context.resume();
  const now=context.currentTime;const oscillator=context.createOscillator();const gain=context.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(880,now);oscillator.frequency.exponentialRampToValueAtTime(1320,now+.045);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.075);
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start(now);oscillator.stop(now+.08);
}

function Background() {
  const particles = useMemo(() => Array.from({length: 24}, (_, i) => ({
    id:i, left:(i * 41.7) % 100, top:(i * 27.3) % 100, delay:(i%8)*.7, duration:5+(i%7)
  })), []);
  return <div className="background" aria-hidden="true">
    <div className="grid" />
    <div className="scanline" />
    <div className="vignette" />
    {particles.map(p => <motion.i key={p.id} className="particle" style={{left:`${p.left}%`,top:`${p.top}%`}} animate={{opacity:[0,.7,0], y:[0,-28]}} transition={{duration:p.duration,repeat:Infinity,delay:p.delay}} />)}
    <div className="data-stream left-stream">{fragments.map((f,i)=><span key={i}>{f}</span>)}</div>
    <div className="data-stream right-stream">{[...fragments].reverse().map((f,i)=><span key={i}>{f}</span>)}</div>
  </div>
}

function Brand() { return <div className="brand"><div className="brand-mark"><span>N</span></div><span className="brand-text">NEVER'İ BUL</span><span className="brand-code">// 7B</span></div> }

function StatusBar({stage}:{stage:number}) { return <header className="topbar"><Brand/><div className="system-status"><span className="pulse-dot"/> SİSTEM AKTİF <em>00:{String(42+stage*3).padStart(2,'0')}:19</em></div></header> }

function Intro({onStart}:{onStart:()=>void}) {
  return <motion.main className="intro page" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,filter:'blur(12px)'}}>
    <div className="intro-coordinate coord-a">40.9930° K / 29.1244° D</div>
    <div className="intro-coordinate coord-b">BAĞLANTI // GÜVENLİ</div>
    <motion.div className="hero-lock" initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:.8}}><Fingerprint size={28}/></motion.div>
    <motion.p className="kicker" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.35}}>GİZLİ PROTOKOL // ERİŞİM SEVİYESİ 01</motion.p>
    <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.5,duration:.7}}>NEVER'İ <span>BUL</span></motion.h1>
    <motion.div className="hero-line" initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:.8,duration:.8}} />
    <motion.p className="subtitle" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}}>Sadece dikkatli olanlar<br className="mobile-break"/> Never'a ulaşabilir.</motion.p>
    <motion.button className="primary-button hero-button" onClick={onStart} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:1.15}} whileHover={{scale:1.02}} whileTap={{scale:.98}}>
      <span>GÖREVE BAŞLA</span><ArrowRight size={18}/><i/>
    </motion.button>
    <motion.div className="auth-note" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.4}}><ShieldCheck size={14}/> UÇTAN UCA ŞİFRELİ OTURUM</motion.div>
  </motion.main>
}

function Briefing({onContinue}:{onContinue:()=>void}) {
  return <motion.main className="page briefing-wrap" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,x:-30}}>
    <motion.section className="glass briefing" initial={{scale:.96,y:20}} animate={{scale:1,y:0}}>
      <div className="corner c1"/><div className="corner c2"/><div className="corner c3"/><div className="corner c4"/>
      <div className="terminal-head"><span><Terminal size={15}/> GÖREV_BRİFİNGİ.TXT</span><span className="terminal-dots"><i/><i/><i/></span></div>
      <div className="briefing-content">
        <p className="mono green">&gt; KİMLİK DOĞRULANDI</p>
        <h2>MERHABA ELİZA,<br/><span>HOŞ GELDİN.</span></h2>
        <p>Gerçekten beni görmek istiyorsan bu sınavı geçmen gerekiyor. Önünde <strong>11 basit soru ve puzzle</strong> var.</p>
        <div className="rules">
          <div><span>01</span><p>Her görev yalnızca bir önceki tamamlandığında açılır.</p></div>
          <div><span>02</span><p>Cevaplarını dikkatle seç. Sistem tüm sapmaları kaydeder.</p></div>
          <div><span>03</span><p>Son aşamadaki içerik yalnızca bir kez görüntülenebilir.</p></div>
        </div>
        <button className="primary-button full" onClick={onContinue}><span>PROTOKOLÜ BAŞLAT</span><ChevronRight size={18}/><i/></button>
      </div>
    </motion.section>
  </motion.main>
}

function MemoryVisual({revealed}:{revealed:boolean}) { return <div className="memory-box"><AnimatePresence mode="wait">{revealed ? <motion.div key="code" initial={{filter:'blur(20px)',opacity:0}} animate={{filter:'blur(0)',opacity:1}} exit={{filter:'blur(18px)',opacity:0}} className="memory-code">7 <b>—</b> 2 <b>—</b> 9 <b>—</b> 4</motion.div> : <motion.div key="hidden" initial={{opacity:0}} animate={{opacity:1}} className="memory-hidden"><Eye size={24}/><span>SİNYAL GİZLENDİ</span></motion.div>}</AnimatePresence></div> }

function BlurVisual() { return <div className="blur-visual"><div className="key-shape"><div/><i/><span/></div><div className="focus-frame"><i/><i/><i/><i/></div><span>GÖRÜNTÜ NETLİĞİ: %12</span></div> }
function HiddenVisual() { return <div className="hidden-visual"><span className="secret s1">3</span><span className="secret s2">1</span><span className="secret s3">6</span><div className="radar"><i/><i/><i/></div><p>Katmanlar arasında gezin.</p></div> }
function PersonClue() { return <div className="person-clue person-photo-clue"><img src="/aleyna-ozgun.jpg" alt="Kısmetse Olur 2026 yarışmacısı" draggable={false}/><div><strong>KISMETSE OLUR: AŞKIN GÜCÜ 2026</strong><p>Görseldeki yarışmacıyı tanı ve doğru ismi seç.</p></div></div> }

function TilePuzzle({onSolved}:{onSolved:()=>void}) {
  const [items,setItems]=useState(['■','●','▲']);
  const move=(index:number,dir:number)=>{const next=[...items];const target=index+dir;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setItems(next)};
  const correct=items.join('')==='●▲■';
  return <div className="tile-puzzle"><div className="puzzle-target"><Lock size={15}/><span>HEDEF DESEN</span><strong>● ▲ ■</strong></div><div className="tile-row">{items.map((item,index)=><motion.div layout key={item} className="puzzle-tile"><span>{item}</span><div><button aria-label="Sola taşı" onClick={()=>move(index,-1)}>←</button><button aria-label="Sağa taşı" onClick={()=>move(index,1)}>→</button></div></motion.div>)}</div><button disabled={!correct} className="secondary-button" onClick={onSolved}>{correct?'KİLİDİ AÇ':'DESENİ TAMAMLA'}</button></div>
}

function DragPuzzle({onSolved}:{onSolved:()=>void}) {
  const [items,setItems]=useState([{v:3,c:'ÜÇ'},{v:1,c:'BİR'},{v:2,c:'İKİ'}]);
  const move=(index:number,dir:number)=>{const n=[...items];const target=index+dir;if(target<0||target>=n.length)return;[n[index],n[target]]=[n[target],n[index]];setItems(n);};
  const correct=items.map(x=>x.v).join(',')==='1,2,3';
  return <div className="drag-puzzle"><div className="drag-list">{items.map((it,i)=><motion.div layout key={it.v} className="drag-item"><GripVertical size={18}/><div><span>{it.v}</span><small>{it.c} NUMARALI KART</small></div><div className="move-buttons"><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button></div></motion.div>)}</div><button disabled={!correct} className="secondary-button" onClick={onSolved}>{correct?'SIRALAMAYI ONAYLA':'1 · 2 · 3 SIRASINI OLUŞTUR'}</button></div>
}

function ChallengeView({stage,onCorrect}:{stage:number,onCorrect:()=>void}) {
  const ch=challenges[stage-1];
  const [feedback,setFeedback]=useState<Feedback>('idle');
  const [selected,setSelected]=useState<string>('');
  const [memoryVisible,setMemoryVisible]=useState(stage===2);
  const [textAnswer,setTextAnswer]=useState('');
  useEffect(()=>{setFeedback('idle');setSelected('');setTextAnswer('');setMemoryVisible(stage===2);if(stage===2){const t=setTimeout(()=>setMemoryVisible(false),3000);return()=>clearTimeout(t)}},[stage]);
  const submit=(id:string)=>{
    if(feedback!=='idle')return;setSelected(id);
    if(id===ch.answer){setFeedback('correct');setTimeout(onCorrect,650)}else{setFeedback('wrong');setTimeout(()=>{setFeedback('idle');setSelected('')},750)}
  };
  return <motion.main className="challenge-page page" key={stage} initial={{opacity:0,x:35}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-35}}>
    <div className="progress-area">
      <div className="progress-label"><span>GÖREV {String(stage).padStart(2,'0')} <em>/ {challenges.length}</em></span><small>{Math.round(stage/challenges.length*100)}% TAMAMLANDI</small></div>
      <div className="progress-track"><motion.i initial={{width:`${(stage-1)/challenges.length*100}%`}} animate={{width:`${stage/challenges.length*100}%`}} transition={{duration:.8,ease:'easeOut'}} /></div>
      <div className="stage-nodes">{challenges.map((_,i)=><i key={i} className={i<stage?'active':''}/>)}</div>
    </div>
    <section className="challenge-layout">
      <div className="mission-meta"><span className="mission-number">{String(stage).padStart(2,'0')}</span><div><small>{ch.eyebrow}</small><strong>{ch.code}</strong></div></div>
      <div className="glass challenge-card">
        <div className="card-noise"/><div className="difficulty"><span>ZORLUK</span>{Array.from({length:5},(_,i)=><i key={i} className={i<Math.ceil(stage/2)?'on':''}/>)}</div>
        <div className="challenge-copy"><p className="mono green">// {ch.code}</p><h2>{ch.title}</h2><p>{ch.description}</p></div>
        {ch.type==='memory' && <MemoryVisual revealed={memoryVisible}/>} {ch.type==='blur'&&<BlurVisual/>} {ch.type==='hidden'&&<HiddenVisual/>} {ch.type==='person'&&<PersonClue/>}
        {ch.type==='drag' ? <DragPuzzle onSolved={()=>submit('done')}/> : ch.type==='tiles' ? <TilePuzzle onSolved={()=>submit('done')}/> : ch.type==='text' ? <form className="date-answer" onSubmit={event=>{event.preventDefault();submit(textAnswer.trim())}}><label htmlFor="special-date">TARİH</label><input id="special-date" value={textAnswer} onChange={event=>setTextAnswer(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="GG.AA.YYYY" maxLength={10} disabled={feedback!=='idle'}/><button className="secondary-button" type="submit" disabled={textAnswer.trim().length!==10}>CEVABI ONAYLA</button></form> : <div className={`choices ${ch.type==='choice'&&stage===1?'symbol-choices':''}`}>{ch.choices?.map((choice,index)=><button key={choice.id} className={`choice ${selected===choice.id?'selected':''}`} onClick={()=>submit(choice.id)}><span className="choice-key">{String.fromCharCode(65+index)}</span><span>{choice.label}</span><i>{selected===choice.id?<Check size={16}/>:null}</i></button>)}</div>}
        <div className="card-footer"><span><Lock size={12}/> CEVAP ŞİFRELİ İLETİLECEK</span><span>DENEME: ∞</span></div>
      </div>
    </section>
    <AnimatePresence>{feedback!=='idle'&&<FeedbackOverlay type={feedback}/>}</AnimatePresence>
  </motion.main>
}

function FeedbackOverlay({type}:{type:'correct'|'wrong'}) {const ok=type==='correct';return <motion.div className={`feedback ${type}`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.12}}><motion.div initial={{scale:.92,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:.14}}><div className="feedback-icon">{ok?<ShieldCheck size={42}/>:<ShieldAlert size={42}/>}</div><p>{ok?'ERİŞİM ONAYLANDI':'ERİŞİM REDDEDİLDİ'}</p><span>{ok?'SONRAKİ KATMAN AÇILIYOR...':'SAPMA ALGILANDI // TEKRAR DENE'}</span></motion.div></motion.div>}

const mazePath='M 54 548 L 54 462 L 132 462 L 132 520 L 218 520 L 218 398 L 92 398 L 92 306 L 270 306 L 270 454 L 350 454 L 350 246 L 176 246 L 176 154 L 398 154 L 398 340 L 472 340 L 472 92 L 286 92 L 286 48 L 526 48';

function ScaryMaze({onFinished}:{onFinished:()=>void}) {
  const audioRef=useRef<HTMLAudioElement>(null);
  const pathRef=useRef<SVGPathElement>(null);
  const [started,setStarted]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [position,setPosition]=useState({x:54,y:548});
  const [scared,setScared]=useState(false);
  const finishRef=useRef(false);

  useEffect(()=>{const image=new Image();image.src='/JUMP.webp';audioRef.current?.load()},[]);
  useEffect(()=>()=>{if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0}},[]);

  const unlockAudio=async()=>{
    const audio=audioRef.current;if(!audio)return;
    try{audio.volume=.01;await audio.play();audio.pause();audio.currentTime=0;audio.volume=1}catch{audio.volume=1}
  };
  const start=async()=>{await unlockAudio();setPosition({x:54,y:548});setStarted(true)};
  const triggerScare=()=>{
    if(finishRef.current)return;finishRef.current=true;setDragging(false);setScared(true);
    const audio=audioRef.current;if(audio){audio.currentTime=0;audio.volume=1;void audio.play().catch(()=>{})}
    navigator.vibrate?.([120,45,220,45,160]);
    setTimeout(()=>{if(audio){audio.pause();audio.currentTime=0}onFinished()},1900);
  };
  const move=(event:React.PointerEvent<SVGSVGElement>)=>{
    if(!dragging||scared)return;
    const svg=event.currentTarget;const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const matrix=svg.getScreenCTM();if(!matrix)return;const local=point.matrixTransform(matrix.inverse());
    const x=Math.max(18,Math.min(562,local.x));const y=Math.max(18,Math.min(582,local.y));
    const path=pathRef.current;if(!path)return;let nearest=Infinity;let progress=0;const total=path.getTotalLength();
    for(let i=0;i<=total;i+=5){const p=path.getPointAtLength(i);const distance=Math.hypot(p.x-x,p.y-y);if(distance<nearest){nearest=distance;progress=i/total}}
    if(nearest>30){setDragging(false);setPosition({x:54,y:548});return}
    setPosition({x,y});if(progress>.965)triggerScare();
  };

  return <motion.main className="maze-page page" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
    <audio ref={audioRef} src="/JUMP.mp3" preload="auto" playsInline/>
    {!started?<section className="maze-brief glass"><Fingerprint size={34}/><p className="mono green">// SON GÜVENLİK KATMANI</p><h1>SİNYALİ<br/><span>ÇIKIŞA TAŞI</span></h1><p>Yeşil çekirdeğe dokun. Parmağını kaldırmadan ve koridordan çıkmadan hedefe ulaş.</p><button className="primary-button" onClick={start}><span>LABİRENTİ BAŞLAT</span><ArrowRight size={17}/><i/></button></section>:
    <section className="maze-shell"><div className="maze-heading"><div><p className="mono green">// ODAK MODU</p><h2>ÇİZGİDEN ÇIKMA</h2></div><span>{dragging?'SİNYAL BAĞLI':'ÇEKİRDEĞE DOKUN'}</span></div><div className="maze-board"><svg viewBox="0 0 580 600" onPointerMove={move} onPointerUp={()=>setDragging(false)} onPointerCancel={()=>setDragging(false)}><path className="maze-glow" d={mazePath}/><path ref={pathRef} className="maze-route" d={mazePath}/><circle className="maze-start" cx="54" cy="548" r="32"/><circle className="maze-goal" cx="526" cy="48" r="28"/><text x="526" y="53" textAnchor="middle">ÇIKIŞ</text><circle className="maze-player" cx={position.x} cy={position.y} r="17" onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);setDragging(true)}}/></svg></div><p className="maze-help">Parmağını yeşil kürenin üzerinde tut ve yolu takip et.</p></section>}
    <AnimatePresence>{scared&&<motion.div className="jump-scare" initial={{opacity:0,scale:1.45}} animate={{opacity:1,scale:1}} transition={{duration:.06}}><img src="/JUMP.webp" alt="" draggable={false}/><div className="scare-flash"/></motion.div>}</AnimatePresence>
  </motion.main>
}

function RevealApproval({onApprove}:{onApprove:()=>void}) {
  return <motion.main className="reveal-page page" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,filter:'blur(10px)'}}>
    <motion.div className="reveal-emblem" initial={{scale:0,rotate:-45}} animate={{scale:1,rotate:0}} transition={{type:'spring',duration:.7}}><ShieldCheck size={38}/><i/></motion.div>
    <motion.p className="mono green" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15}}>// KİMLİK DOĞRULANDI</motion.p>
    <motion.h1 initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.25}}>TEBRİKLER ELİZA</motion.h1>
    <motion.p className="reveal-copy" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.38}}>ARTIK BENİ<br/><span>GÖREBİLİRSİN</span></motion.p>
    <motion.button className="primary-button reveal-button" onClick={onApprove} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.55}} whileTap={{scale:.97}}><span>ONAYLA</span><Check size={18}/><i/></motion.button>
    <motion.small initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.75}}>GİZLİ DOSYALARA ERİŞİM İÇİN ONAYLA</motion.small>
  </motion.main>
}

function SecureImage({index,onViewed}:{index:number,onViewed:()=>void}) {
  const [open,setOpen]=useState(false); const [used,setUsed]=useState(false); const [count,setCount]=useState(5);
  const openIt=()=>{if(used)return;setOpen(true);setUsed(true);setCount(5)};
  useEffect(()=>{if(!open)return;const timer=setInterval(()=>setCount(c=>{if(c<=1){clearInterval(timer);setOpen(false);onViewed();return 0}return c-1}),1000);return()=>clearInterval(timer)},[open]);
  const imageSrc=index===1?'/1234.png':'/123.png';
  return <><button className={`secure-thumb ${used?'used':''}`} onClick={openIt} disabled={used}><div className="classified-art"><img src={imageSrc} alt={`Gizli dosya ${index}`} draggable={false}/><div className="watermark">NEVER // {Math.random().toString(16).slice(2,8).toUpperCase()}</div></div><div className="thumb-overlay">{used?<><X/><span>GÖRSEL KİLİTLENDİ</span></>:<><Eye/><span>TEK SEFER GÖRÜNTÜLE</span></>}</div><span className="image-label">DOSYA_0{index}.ENC</span></button><AnimatePresence>{open&&<motion.div className="image-modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,filter:'blur(24px)'}}><img className="secure-full-image" src={imageSrc} alt={`Gizli dosya ${index}`} draggable={false}/><div className="countdown"><Timer/><strong>{count}</strong><span>SANİYE SONRA KAPANACAK</span></div></motion.div>}</AnimatePresence></>
}

function Complete() {const [viewed,setViewed]=useState(0);return <motion.main className="complete-page page" initial={{opacity:0}} animate={{opacity:1}}><motion.div className="complete-emblem" initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} transition={{type:'spring',duration:1}}><Check size={42}/><i/></motion.div><p className="mono green">// TÜM PUZZLELAR TAMAMLANDI</p><h1>NEVER<br/><span>BULUNDU</span></h1><p className="complete-copy"><strong>Tebrikler Eliza.</strong><br/>Sınavın bütün aşamalarını başarıyla tamamladın.</p><div className="unlocked"><span/><p>2 GİZLİ DOSYANIN KİLİDİ AÇILDI</p><span/></div><div className="image-grid"><SecureImage index={1} onViewed={()=>setViewed(v=>v+1)}/><SecureImage index={2} onViewed={()=>setViewed(v=>v+1)}/></div>{viewed>0&&<motion.div className="viewed-warning" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}><CircleAlert size={15}/> Bu görsel artık görüntülenemez.</motion.div>}</motion.main>}

function SecurityLayer() {
  const [obscured,setObscured]=useState(false); const [warning,setWarning]=useState('');
  useEffect(()=>{
    const context=(e:MouseEvent)=>e.preventDefault(); const drag=(e:DragEvent)=>e.preventDefault();
    const visibility=()=>setObscured(document.hidden); const blur=()=>setObscured(true); const focus=()=>setObscured(false);
    const key=(e:KeyboardEvent)=>{if(e.key==='PrintScreen'){setObscured(true);setWarning('EKRAN YAKALAMA GİRİŞİMİ ENGELLENDİ');navigator.clipboard?.writeText('').catch(()=>{});setTimeout(()=>{setObscured(false);setWarning('')},1800)}};
    document.addEventListener('contextmenu',context);document.addEventListener('dragstart',drag);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('keyup',key);
    return()=>{document.removeEventListener('contextmenu',context);document.removeEventListener('dragstart',drag);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('keyup',key)}
  },[]);
  return <>{<AnimatePresence>{obscured&&<motion.div className="privacy-screen" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Eye/><strong>İÇERİK GİZLENDİ</strong><span>Güvenli alana dönmek için pencereyi etkinleştir.</span></motion.div>}</AnimatePresence>}{warning&&<div className="security-warning"><ShieldAlert/>{warning}</div>}<div className="session-watermark">REACH • GİZLİ OTURUM • {new Date().getFullYear()}</div></>
}

function App(){
  const[phase,setPhase]=useState<Phase>('intro');const[stage,setStage]=useState(1);const musicRef=useRef<HTMLAudioElement>(null);const musicUnlocked=useRef(false);
  const next=()=>{if(stage===challenges.length)setPhase('maze');else setStage(s=>s+1)};
  const handlePointerDown=(event:React.PointerEvent<HTMLDivElement>)=>{
    playClickSound(event.target);const music=musicRef.current;if(!music||musicUnlocked.current)return;musicUnlocked.current=true;
    music.volume=.01;void music.play().then(()=>{music.pause();music.currentTime=0;music.volume=.72}).catch(()=>{music.volume=.72});
  };
  useEffect(()=>{if(phase!=='reveal')return;const music=musicRef.current;if(!music)return;music.volume=.72;music.currentTime=0;void music.play().catch(()=>{})},[phase]);
  return <div className="app" onPointerDown={handlePointerDown}><audio ref={musicRef} src="/final-music.mp3" preload="auto" loop playsInline/><Background/><StatusBar stage={stage}/><AnimatePresence mode="wait">{phase==='intro'&&<Intro key="intro" onStart={()=>setPhase('briefing')}/>} {phase==='briefing'&&<Briefing key="brief" onContinue={()=>setPhase('challenge')}/>} {phase==='challenge'&&<ChallengeView key={`c${stage}`} stage={stage} onCorrect={next}/>} {phase==='maze'&&<ScaryMaze key="maze" onFinished={()=>setPhase('reveal')}/>} {phase==='reveal'&&<RevealApproval key="reveal" onApprove={()=>setPhase('complete')}/>} {phase==='complete'&&<Complete key="complete"/>}</AnimatePresence><SecurityLayer/></div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
