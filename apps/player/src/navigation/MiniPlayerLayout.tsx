import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Platform,View,useWindowDimensions} from 'react-native';
import {SafeAreaView as NativeSafeAreaView} from 'react-native-screens/experimental';
import {miniPlayerBottom} from '../uiPolicy';
type Frame={owner:string;bottom:number}|null;
const Layout=createContext<{frame:Frame;report:(owner:string,bottom:number|null)=>void}>({frame:null,report:()=>{}});
export function MiniPlayerLayoutProvider({children}:{children:React.ReactNode}){
 const [frame,setFrame]=useState<Frame>(null);
 const report=useCallback((owner:string,bottom:number|null)=>setFrame(current=>bottom===null?(current?.owner===owner?null:current):current?.owner===owner&&Math.abs(current.bottom-bottom)<1?current:{owner,bottom}),[]);
 const value=useMemo(()=>({frame,report}),[frame,report]);return <Layout.Provider value={value}>{children}</Layout.Provider>;
}
/** Measure inside native interface insets, including adaptive tab bars, without moving video. */
export function MiniPlayerSafeFrame({owner,focused}:{owner:string;focused:boolean}){
 const {report}=useContext(Layout);const child=useRef<React.ComponentRef<typeof View>>(null);const {width,height}=useWindowDimensions();
 const active=useRef(focused);active.current=focused;
 const measure=useCallback(()=>{if(focused)child.current?.measureInWindow((_x,y,_width,h)=>{if(active.current&&h>0)report(owner,y+h)})},[focused,owner,report]);
 useEffect(()=>{if(focused){const token=requestAnimationFrame(measure);return()=>cancelAnimationFrame(token)}report(owner,null)},[focused,width,height,measure,owner,report]);
 useEffect(()=>()=>report(owner,null),[owner,report]);
 const content=<View pointerEvents="none" accessibilityElementsHidden collapsable={false} ref={child} onLayout={measure} style={{flex:1}}/>;
 return <View collapsable={false} pointerEvents="none" accessibilityElementsHidden accessible={false} importantForAccessibility="no-hide-descendants" style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>{Platform.OS!=='android'?content:<NativeSafeAreaView pointerEvents="none" accessibilityElementsHidden style={{flex:1}} edges={{bottom:true}} insetType="all">{content}</NativeSafeAreaView>}</View>;
}
export function useMeasuredMiniPlayerBottom(){
 const {frame}=useContext(Layout);const root=useRef<React.ComponentRef<typeof View>>(null);const [bottom,setBottom]=useState<number|null>(null);const {width,height}=useWindowDimensions();
 const measure=useCallback(()=>root.current?.measureInWindow((_x,y,_w,h)=>{if(h>0)setBottom(y+h)}),[]);
 useEffect(()=>{const token=requestAnimationFrame(measure);return()=>cancelAnimationFrame(token)},[width,height,measure]);
 return {root,measure,bottom:(safe:number)=>miniPlayerBottom(bottom,frame?.bottom??null,safe)};
}
