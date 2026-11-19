import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import type {Media} from '../src/provider';
import type {Profile} from '../src/vault';
import type {GuideProgramme} from '../src/xmltv';
import {guideProgrammes} from '../src/guideStore';
import {Text} from '../src/Typography';
import {Button,colors,u} from '../src/ui';
import {tvSafe} from '../src/designTokens';
export default function TVInfoOverlay({item,profile,onClose}:{item:Media;profile:Profile|undefined;onClose:()=>void}){
 const [programmes,setProgrammes]=useState<GuideProgramme[]>([]);
 useEffect(()=>{let alive=true;const id=profile?.guide?.mapping?.[item.id]||item.epgId;if(profile&&id)void guideProgrammes(profile.id,[id],'',Date.now()-3600000,Date.now()+12*3600000).then(rows=>{if(alive)setProgrammes(rows)}).catch(()=>{});return()=>{alive=false}},[profile?.id,item.id]);
 const now=programmes.find(p=>p.start<=Date.now()&&p.end>Date.now());const next=programmes.find(p=>p.start>(now?.start||Date.now()));
 const progress=now?Math.max(0,Math.min(100,(Date.now()-now.start)/(now.end-now.start)*100)):0;
 return <View nativeID="tv-trap:channel-info" style={{position:'absolute',left:tvSafe.h,right:tvSafe.h,bottom:tvSafe.v,padding:24,gap:16,borderRadius:16,backgroundColor:colors.panel}}><Text accessibilityRole="header" style={u.h2}>{item.name} · LIVE</Text><Text style={u.body}>On now · {now?.title||'No programme information available'}</Text>{now&&<View style={{height:8,backgroundColor:colors.line,borderRadius:4}}><View style={{height:8,width:`${progress}%`,backgroundColor:colors.link,borderRadius:4}}/></View>}<Text style={u.body}>Up next · {next?.title||'No upcoming programme reported'}</Text><Button nativeID="tv-preferred:close-channel-info" title="Back to video" variant="secondary" onPress={onClose}/></View>;
}
