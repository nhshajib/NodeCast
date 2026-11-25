package __PACKAGE__

import android.app.Activity
import android.graphics.Outline
import android.graphics.Rect
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.HorizontalScrollView
import android.widget.ScrollView
import com.facebook.react.R
import com.facebook.react.ReactActivity
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.ContextWrapper

/** Android TV key navigation for the standard React Native renderer, with no touch synthesis. */
class TVRemoteController(private val activity: Activity) {
  private val root get() = activity.window.decorView
  private val remembered = mutableMapOf<String, String>()
  private var pressed: View? = null
  private var wakingKey: Int? = null
  private var scheduled = false
  private var dirty = true
  private var collectedAt=0L
  private var cached = emptyList<View>()
  private var highlighted: View? = null
  private var indicator: LayerDrawable? = null
  private var indicatedControl: View? = null
  private val scopeMounts = java.util.IdentityHashMap<View, Long>()
  private var mountSequence = 0L
  private var activeScope: View? = null
  private var activeScopeName: String? = null
  private val scopeNames = java.util.IdentityHashMap<View, String>()
  private var scopeRoots = emptyList<View>()
  private val indicatorLayout = View.OnLayoutChangeListener { view, _, _, _, _, _, _, _, _ ->
    indicatorBounds(view)
  }
  private fun indicatorBounds(container:View) {
    val control=indicatedControl?:container
    val bounds=Rect(0,0,control.width,control.height)
    if(container!==control && container is ViewGroup){if(!inside(control,container))return;container.offsetDescendantRectToMyCoords(control,bounds)}
    indicator?.bounds=bounds
  }
  private fun highlight(next: View?) {
    highlighted?.let { old -> indicator?.let { old.overlay.remove(it) };old.removeOnLayoutChangeListener(indicatorLayout);old.scaleX=1f;old.scaleY=1f }
    highlighted=null;indicator=null;indicatedControl=null
    if(next==null||next is EditText||!actionable(next)||nativeId(next)=="tv-preferred:reveal-controls")return
    var target:View=next
    var parent=next.parent as? View
    while(parent!=null){
      if(nativeId(parent)?.startsWith("tv-focus-container:")==true){target=parent;break}
      if(nativeId(parent)?.startsWith("tv-scope:")==true||nativeId(parent)?.startsWith("tv-trap:")==true)break
      parent=parent.parent as? View
    }
    val dp=target.resources.displayMetrics.density
    val outline=Outline()
    next.outlineProvider?.getOutline(next,outline)
    val fallback=if((nativeId(next)?.contains("button:")==true || nativeId(next)?.contains("playback-toggle")==true || nativeId(next)?.contains("category:")==true))next.height/2f else 16*dp
    val radius=if(outline.radius>0f)outline.radius else (next.background as? GradientDrawable)?.cornerRadius ?: fallback
    fun line(color:Int,width:Float,corner:Float)=GradientDrawable().apply { setColor(Color.TRANSPARENT);cornerRadius=corner.coerceAtLeast(0f);setStroke((width*dp).toInt().coerceAtLeast(1),color) }
    // White remains visible on green; the night separator remains visible on white.
    val ring=LayerDrawable(arrayOf(line(Color.WHITE,3f,radius),line(Color.rgb(10,14,12),2f,radius-3*dp)))
    ring.setLayerInset(1,(3*dp).toInt(),(3*dp).toInt(),(3*dp).toInt(),(3*dp).toInt())
    // Grow at most ~8 dp per side so wide rows and edge buttons keep their ring on screen.
    val grow=16*dp
    val scale=minOf(1.05f,1f+grow/target.width.coerceAtLeast(1),1f+grow/target.height.coerceAtLeast(1))
    target.scaleX=scale;target.scaleY=scale
    // A row's main action takes the whole row's outline, so its buttons sit inside the ring.
    val whole=target!==next&&next.width>=target.width*0.6f
    indicatedControl=if(whole)target else next;indicator=ring;indicatorBounds(target);target.overlay.add(ring)
    target.addOnLayoutChangeListener(indicatorLayout);highlighted=target;indicator=ring
  }
  private val arrows = mapOf(KeyEvent.KEYCODE_DPAD_UP to View.FOCUS_UP, KeyEvent.KEYCODE_DPAD_DOWN to View.FOCUS_DOWN,
    KeyEvent.KEYCODE_DPAD_LEFT to View.FOCUS_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT to View.FOCUS_RIGHT)
  init {
    root.viewTreeObserver.addOnGlobalFocusChangeListener { _, next ->
      highlight(next)
      if (next != null && allowed(next)) nativeId(next)?.let { id ->
        remembered[scope(next)] = focusId(id)
        (scroller(next,false)?:scroller(next,true))?.let { box -> remembered["container:"+(nativeId(box)?:System.identityHashCode(box).toString())]=focusId(id) }
        while(remembered.size>300)remembered.remove(remembered.keys.first())
      }
    }
    // Fabric can mount/reparent native views without an Android global-layout pass.
    // Repair invalid/hidden focus before drawing; reuse the bounded candidate cache.
    root.viewTreeObserver.addOnPreDrawListener {
      val current=activity.currentFocus
      if(root.hasWindowFocus()&&(current !is EditText||!imeVisible())){
        if(current==null||!actionable(current)){
          dirty=true;ensureFocus()
        }else if(android.os.SystemClock.uptimeMillis()-collectedAt>=250){
          ensureFocus()
        }
      }
      true
    }
    root.viewTreeObserver.addOnGlobalLayoutListener {
      dirty=true
      if (!scheduled) {
        scheduled = true
        root.postDelayed({ scheduled = false; ensureFocus() },80)
      }
    }
  }
  private fun focusId(id: String) = id.replace("tv-preferred:","tv-control:")
  private fun nativeId(view: View) = view.getTag(R.id.view_tag_native_id) as? String
  private fun scope(view: View): String {
    var node: View? = view
    while (node != null) {
      val id = nativeId(node)
      if (id?.startsWith("tv-scope:") == true || id?.startsWith("tv-trap:") == true) return id
      node = node.parent as? View
    }
    return "root"
  }
  private fun allowed(view: View): Boolean {
    if (!view.isAttachedToWindow || !view.isShown || view.width <= 0 || view.height <= 0) return false
    var node: View? = view
    while (node != null) {
      if (node.alpha <= .01f || node.importantForAccessibility == View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) return false
      node = node.parent as? View
    }
    return true
  }
  private fun actionable(view: View) = allowed(view) && view.isEnabled && view.isFocusable &&
    (view is com.facebook.react.views.view.ReactViewGroup && view.isClickable || view is EditText && view.keyListener != null)
  private fun inside(view: View, parent: View): Boolean {
    var node: View? = view
    while (node != null) { if (node === parent) return true; node = node.parent as? View }
    return false
  }
  private fun candidates(): List<View> {
    val now=android.os.SystemClock.uptimeMillis()
    if(!dirty&&now-collectedAt<250)return cached.filter { it.isAttachedToWindow&&it.isEnabled&&it.isFocusable }
    dirty=false;collectedAt=now
    val mounted=mutableListOf<View>()
    val views = mutableListOf<View>(); val occluders=mutableListOf<View>(); var trap: View? = null
    fun visit(view: View) {
      if (!view.isAttachedToWindow || view.visibility!=View.VISIBLE || view.alpha<=.01f || view.importantForAccessibility==View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) return
      if (nativeId(view)?.startsWith("tv-scope:")==true || nativeId(view)?.startsWith("tv-trap:")==true) {
        mounted.add(view)
        val name=nativeId(view)!!
        if(!scopeMounts.containsKey(view)||scopeNames[view]!=name){scopeMounts[view]=++mountSequence;scopeNames[view]=name}
      }
      if (nativeId(view)?.startsWith("tv-trap:") == true) trap = view
      if (nativeId(view)?.startsWith("tv-scope:mini") == true) occluders.add(view)
      if (view.width>0&&view.height>0&&view.isEnabled&&view.isFocusable&&(view is com.facebook.react.views.view.ReactViewGroup&&view.isClickable||view is EditText&&view.keyListener!=null)) views.add(view)
      if (view is ViewGroup) for (i in 0 until view.childCount) visit(view.getChildAt(i))
    }
    visit(root)
    scopeMounts.keys.retainAll(mounted.toSet());scopeNames.keys.retainAll(mounted.toSet());scopeRoots=mounted
    val active = trap
    cached = views.filter { view -> (active == null || inside(view,active)) && occluders.none { cover -> !inside(view,cover) && rect(cover).contains(rect(view).centerX(),rect(view).centerY()) } }
    return cached
  }
  private fun rect(view: View): Rect {
    // Focus scale is decoration, not layout. getLocationOnScreen includes its
    // transformed origin while width/height remain unscaled, moving the center
    // and making same-column rail items look like Right/Left destinations.
    val bounds=Rect(0,0,view.width,view.height)
    if(view!==root && root is ViewGroup)(root as ViewGroup).offsetDescendantRectToMyCoords(view,bounds)
    val origin=IntArray(2);root.getLocationOnScreen(origin)
    bounds.offset(origin[0],origin[1])
    return bounds
  }
  private fun visible(view: View): Boolean { val r = Rect(); return view.getGlobalVisibleRect(r) && r.width() > 8 && r.height() > 8 }
  private fun focus(view: View) {
    view.isFocusableInTouchMode = true
    // Ask the nearest list to keep the item away from the edges (roughly the middle
    // band), so a focused row is never cut off at the bottom of the screen.
    val margin=(scroller(view,false)?.height ?: 0)/4
    view.requestRectangleOnScreen(Rect(0, -margin, view.width, view.height+margin), true)
    view.requestFocus()
  }
  // React Native opens the keyboard on programmatic focus only in touch mode, which a
  // TV never enters, and Fire OS ignores implicit requests from a D-pad press. Focus the
  // field, then ask explicitly once it is the IME's served view.
  private fun showKeyboard(field: EditText) {
    if (!field.isFocused) field.requestFocus()
    val imm = activity.getSystemService(Activity.INPUT_METHOD_SERVICE) as InputMethodManager
    field.post {
      if (android.os.Build.VERSION.SDK_INT >= 30) field.windowInsetsController?.show(android.view.WindowInsets.Type.ime())
      if (!imm.showSoftInput(field, 0)) {
        @Suppress("DEPRECATION")
        imm.showSoftInput(field, InputMethodManager.SHOW_FORCED)
      }
    }
  }
  private fun imeVisible(): Boolean {
    if (android.os.Build.VERSION.SDK_INT >= 30) {
      root.rootWindowInsets?.let { return it.isVisible(android.view.WindowInsets.Type.ime()) }
    }
    val frame = Rect(); root.getWindowVisibleDisplayFrame(frame)
    return root.height - frame.bottom > root.height / 4
  }
  fun onWindowFocus() { dirty=true;root.post { ensureFocus();highlight(activity.currentFocus) } }
  // After a rail item is chosen, focus follows into the page it opened.
  private var pendingContent=0L
  private var pendingScope:String?=null
  private var pendingSince=0L
  private fun ensureFocus(): List<View> {
    val choices = candidates()
    if (!root.hasWindowFocus()) return choices
    val now=android.os.SystemClock.uptimeMillis()
    val current=activity.currentFocus
    val nonRail=scopeRoots.filter { nativeId(it)!="tv-scope:rail" && nativeId(it)?.startsWith("tv-scope:mini")!=true && choices.any { choice -> inside(choice,it) } }
    val latest=nonRail.maxByOrNull { scopeMounts[it] ?: 0L }
    val latestName=latest?.let { nativeId(it) }
    val changed=latest!==activeScope||latestName!=activeScopeName
    val followRail=pendingContent>now&&current!=null&&inRail(current)&&latest!=null
    if(!changed && !followRail && choices.any { it===current })return choices
    val keepCurrent={ if(choices.none { it===current }) (railHome(choices)?:choices.firstOrNull { visible(it) })?.let { focus(it) } }
    // A page that is still fading in has no visible controls yet. Don't mark it handled,
    // so the next pass focuses inside it instead of leaving focus on the rail.
    if(latest==null){keepCurrent();return choices}
    val scoped=choices.filter { inside(it,latest) }
    val shown=scoped.filter { visible(it) }
    if(shown.isEmpty()){keepCurrent();return choices}
    if(pendingScope!=latestName){pendingScope=latestName;pendingSince=now}
    val restored=scoped.firstOrNull { nativeId(it)?.let(::focusId)==remembered[scope(it)] }
    // A virtualized list scrolls back to the remembered row a moment after it mounts.
    if(restored==null&&remembered[latestName!!]!=null&&now-pendingSince<700&&!followRail){keepCurrent();return choices}
    val preferred=shown.firstOrNull { nativeId(it)?.startsWith("tv-preferred:")==true }
    val target=restored ?: preferred ?: readingOrder(shown)
    if(target!=null){focus(target);activeScope=latest;activeScopeName=latestName;pendingContent=0L}
    return choices
  }
  private fun scroller(view: View, horizontal: Boolean): View? {
    var parent = view.parent as? View
    while (parent != null) {
      if (horizontal && parent is HorizontalScrollView || !horizontal && parent is ScrollView) return parent
      parent = parent.parent as? View
    }
    return null
  }
  private fun scrollMore(scroll: View, sign: Int, horizontal: Boolean) {
    if(scroll is HorizontalScrollView)scroll.smoothScrollBy(sign*scroll.width/2,0)
    if(scroll is ScrollView)scroll.smoothScrollBy(0,sign*scroll.height/2)
    val origin=activity.currentFocus
    root.postDelayed({
      dirty=true
      if(activity.currentFocus!==origin)return@postDelayed
      val shown=candidates().filter { inside(it,scroll)&&visible(it) }
      // Continue from where focus was: the nearest revealed control beyond the
      // origin in the pressed direction. Choosing the farthest edge instead sent
      // Up from a control near the top to the bottom of the page.
      val from=origin?.let { rect(it) }
      val ahead=if(from==null)shown else shown.filter { val r=rect(it); if(horizontal){if(sign>0)r.left>=from.right-2 else r.right<=from.left+2}else{if(sign>0)r.top>=from.bottom-2 else r.bottom<=from.top+2} }
      if(from!=null&&ahead.isEmpty())return@postDelayed
      val pool=ahead
      val target=if(sign>0)pool.minByOrNull { if(horizontal)rect(it).left else rect(it).top }
        else pool.maxByOrNull { if(horizontal)rect(it).right else rect(it).bottom }
      target?.let { focus(it) }
    },220)
  }
  private fun contentScroller(from:View,horizontal:Boolean,sign:Int):View? {
    val views=mutableListOf<View>();val a=rect(from)
    fun visit(view:View){
      if(!allowed(view))return
      val matches=if(horizontal)view is HorizontalScrollView else view is ScrollView
      if(matches&&visible(view)&&scope(view)==scope(from)){
        val b=rect(view)
        val beam=if(horizontal)b.bottom>a.top&&b.top<a.bottom else b.right>a.left&&b.left<a.right
        val ahead=if(horizontal){if(sign>0)b.right>a.right else b.left<a.left}else{if(sign>0)b.bottom>a.bottom else b.top<a.top}
        if(beam&&ahead&&(if(horizontal)view.canScrollHorizontally(sign)else view.canScrollVertically(sign)))views.add(view)
      }
      if(view is ViewGroup)for(i in 0 until view.childCount)visit(view.getChildAt(i))
    }
    visit(root);return views.maxByOrNull { it.width*it.height }
  }
  private fun inRail(view: View) = scope(view)=="tv-scope:rail"
  // The rail item for the page on screen (accessibilityState.selected sets View.isSelected).
  private fun railHome(choices: List<View>) = choices.filter { inRail(it)&&visible(it) }.let { rail -> rail.firstOrNull { it.isSelected } ?: rail.firstOrNull() }
  private fun readingOrder(views: List<View>) = views.minWithOrNull(compareBy<View>({ rect(it).top/8 }, { rect(it).left }))
  private fun move(direction: Int, choices: List<View>): Boolean {
    val from = activity.currentFocus ?: return true
    val horizontal = direction == View.FOCUS_LEFT || direction == View.FOCUS_RIGHT
    val positive = direction == View.FOCUS_RIGHT || direction == View.FOCUS_DOWN
    val fromRail=inRail(from)
    // Right leaves the rail for the active screen, rather than geometrically
    // choosing another rail icon while its labels expand/collapse. Restoring
    // the remembered row also scrolls a virtualized list back to that item.
    if(direction==View.FOCUS_RIGHT && fromRail){
      val content=choices.filter { !inRail(it) && (activeScope==null || inside(it,activeScope!!)) }
      val target=content.firstOrNull { nativeId(it)?.let(::focusId)==remembered[scope(it)] }
        ?:content.firstOrNull { visible(it)&&nativeId(it)?.startsWith("tv-preferred:")==true }
        ?:readingOrder(content.filter { visible(it) })
      if(target!=null){focus(target);return true}
    }
    if(fromRail&&direction==View.FOCUS_LEFT)return true
    // Up and Down stay inside the rail; its first and last items are hard stops.
    if(fromRail&&!horizontal){
      val a=rect(from)
      val next=choices.filter { inRail(it)&&it!==from }.map { it to rect(it).centerY()-a.centerY() }
        .filter { (_,dy)->if(positive)dy>2 else dy< -2 }.minByOrNull { (_,dy)->kotlin.math.abs(dy) }?.first
      next?.let { focus(it) }
      return true
    }
    val a = rect(from); val scroll = scroller(from, horizontal)
    val rectangles=choices.associateWith { rect(it) }
    val options = choices.filter { target ->
      // Content never falls into the rail vertically; Left is the only way in.
      target !== from && !(inRail(target)&&!horizontal) && (visible(target) || scroll != null && scroller(target, horizontal) === scroll)
    }.mapNotNull { target ->
      val b = rectangles.getValue(target)
      val primary = if (horizontal) b.centerX() - a.centerX() else b.centerY() - a.centerY()
      if (if (positive) primary <= 2 else primary >= -2) return@mapNotNull null
      val cross = if (horizontal) b.centerY() - a.centerY() else b.centerX() - a.centerX()
      val beam = if (horizontal) b.bottom > a.top && b.top < a.bottom else b.right > a.left && b.left < a.right
      val score = primary.toDouble() * primary + 4.0 * cross * cross + if (beam) 0.0 else 100000.0
      Triple(target, score, beam)
    }
    // A wide row's centre can be farther sideways than the rail's centre.
    // Prefer the directional beam before comparing distance so Down from a
    // toolbar enters the list instead of jumping sideways to the rail.
    val aligned = options.filter { it.third }
    var best = (if (aligned.isNotEmpty()) aligned else if (horizontal) emptyList() else options).minByOrNull { it.second }
    // Up/Down go to the nearest row of aligned controls first; sideways distance only breaks
    // ties within that row. Ranking by centre distance alone skipped a small switch at the
    // right of a row in favour of a farther, wider control (backup's history switch).
    if(!horizontal&&aligned.isNotEmpty()){
      fun gap(t:View):Int { val b=rectangles.getValue(t); return maxOf(0,if(positive)b.top-a.bottom else a.top-b.bottom) }
      // Inside a scrolling list, its own next item (even scrolled out of view) comes first;
      // focus leaves the list only at its end.
      val pool=if(scroll!=null)aligned.filter { scroller(it.first,false)===scroll }.ifEmpty { aligned } else aligned
      val nearest=pool.minOf { gap(it.first) }
      best=pool.filter { gap(it.first)<=nearest+16 }.minByOrNull { val b=rectangles.getValue(it.first); kotlin.math.abs(b.centerX()-a.centerX()) }
    }
    // Inside a horizontal strip (category chips, Home rows), the next item in the strip wins,
    // even when it is scrolled off-screen and a rail item that grazes the row is nearer.
    if(horizontal&&scroll!=null){
      aligned.filter { scroller(it.first,true)===scroll }.minByOrNull { it.second }?.let { best=it }
    }
    // Left into the rail always lands on the current page's item, never the nearest icon.
    if(direction==View.FOCUS_LEFT&&(best==null||inRail(best.first))&&(best!=null||options.any { inRail(it.first) })){
      railHome(choices)?.let { focus(it);return true }
    }
    // Right never jumps diagonally to a control that shares no row with the focus.
    if(horizontal&&best==null){
      val canScrollSide=scroll!=null&&scroll.canScrollHorizontally(if(positive)1 else -1)
      if(!canScrollSide)return true
    }
    val sign = if (positive) 1 else -1
    val canScroll = scroll != null && if (horizontal) scroll.canScrollHorizontally(sign) else scroll.canScrollVertically(sign)
    if (canScroll && (best == null || !best.third)) {
      scrollMore(scroll!!,sign,horizontal)
      return true
    }
    if(best==null&&scroll==null)contentScroller(from,horizontal,sign)?.let { scrollMore(it,sign,horizontal);return true }
    // Entering a different list or grid from outside lands on its remembered item,
    // or its first item, instead of whichever cell happens to sit under the origin.
    best?.let { choice ->
      val target=choice.first
      val container=scroller(target,false)?:scroller(target,true)
      if(!horizontal&&container!=null&&container!==scroller(from,false)&&container!==scroller(from,true)){
        val inside=choices.filter { inside(it,container)&&visible(it) }
        val entry=inside.firstOrNull { nativeId(it)?.let(::focusId)==remembered["container:"+(nativeId(container)?:System.identityHashCode(container).toString())] }
          ?:readingOrder(inside)
        if(entry!=null){focus(entry);return true}
      }
      focus(target)
    }
    return true
  }
  private fun menu(choices: List<View>) {
    val item=activity.currentFocus
    val itemId=item?.let { nativeId(it)?.let(::focusId) }.orEmpty()
    if(item!=null && itemId.startsWith("tv-control:category:")){
      emit(item,"GlowTVCategoryOptions",itemId.substringAfter("tv-control:category:"));return
    }
    if(item!=null && (itemId.startsWith("tv-control:tile:")||itemId.startsWith("tv-control:channel:"))){emit(item,"GlowTVItemOptions",itemId.substringAfter(":tile:",itemId.substringAfter(":channel:")));return}
    val focused=activity.currentFocus?.contentDescription?.toString().orEmpty()
    val channel=if(focused.startsWith("Play "))focused.removePrefix("Play ") else ""
    val target=choices.firstOrNull { channel.isNotEmpty()&&it.contentDescription?.toString()=="Playback options for $channel" }
      ?:choices.firstOrNull { it.contentDescription?.toString()=="Player options" }
      ?:choices.firstOrNull { it.contentDescription?.toString()=="Library options" }
    target?.performClick()
  }
  private fun emit(view: View, name: String, key: Any) {
    var context = view.context
    while (context !is ReactContext && context is ContextWrapper) context = context.baseContext
    if (context is ReactContext && context.hasActiveReactInstance()) {
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, key)
    }
  }
  private fun inPlayer(view: View): Boolean {
    var node: View? = view
    while (node != null) { if (nativeId(node)?.startsWith("tv-trap:player:")==true || nativeId(node)?.startsWith("tv-scope:mini:")==true) return true; node=node.parent as? View }
    return false
  }
  fun dispatch(event: KeyEvent): Boolean {
    // Native IMEs and native dialogs retain their own key handling.
    if (activity.currentFocus is EditText && imeVisible()) return false
    // Route each remote Back through RN exactly once. Android's predictive
    // dispatcher can otherwise finish the Activity before JS sees the key.
    val reactActivity=activity as? ReactActivity
    if(event.keyCode==KeyEvent.KEYCODE_BACK && reactActivity!=null && root.hasWindowFocus()){
      if(event.action==KeyEvent.ACTION_UP && !event.isCanceled){
        @Suppress("DEPRECATION")
        reactActivity.onBackPressed()
      }
      return true
    }
    val direction = arrows[event.keyCode]
    val select = event.keyCode in listOf(KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER, KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_BUTTON_SELECT)
    val media = event.keyCode in listOf(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_REWIND, KeyEvent.KEYCODE_MEDIA_STOP)
    val menuKey=event.keyCode==KeyEvent.KEYCODE_MENU
    val command=when(event.keyCode){KeyEvent.KEYCODE_CHANNEL_UP->"next";KeyEvent.KEYCODE_CHANNEL_DOWN->"previous";KeyEvent.KEYCODE_INFO->"info";KeyEvent.KEYCODE_GUIDE->"guide";else->null}
    if (wakingKey == event.keyCode) { if(event.action==KeyEvent.ACTION_UP)wakingKey=null; return true }
    val wakeKey = event.keyCode == KeyEvent.KEYCODE_BACK
    if (direction == null && !select && !media && !menuKey && !wakeKey && command==null) return false
    val profiled=activity.intent.getBooleanExtra("nodecastTvProfile",false)
    val began=if(profiled)System.nanoTime()else 0L
    val choices = ensureFocus()
    if (choices.isEmpty()) return false
    val owner = choices.firstOrNull { inPlayer(it) }
    val wake = choices.firstOrNull { nativeId(it)=="tv-preferred:reveal-controls" }
    if (owner != null) {
      var player:View?=owner
      while(player!=null && nativeId(player)?.startsWith("tv-trap:player:")!=true && nativeId(player)?.startsWith("tv-scope:mini:")!=true)player=player.parent as? View
      val live=nativeId(player?:owner)?.endsWith(":live")==true
      if(command!=null){if(event.action==KeyEvent.ACTION_UP)emit(owner,"GlowTVRemoteCommand",command);return true}
      // Left over live video opens the channel list, so you can zap without leaving the player.
      if(live && wake!=null && event.keyCode==KeyEvent.KEYCODE_DPAD_LEFT){
        if(event.action==KeyEvent.ACTION_DOWN&&event.repeatCount==0)emit(owner,"GlowTVRemoteCommand","channels");return true
      }
      if(live && wake!=null && event.keyCode in listOf(KeyEvent.KEYCODE_DPAD_UP,KeyEvent.KEYCODE_DPAD_DOWN)){
        if(event.action==KeyEvent.ACTION_DOWN){wakingKey=event.keyCode;emit(owner,"GlowTVRemoteCommand",if(event.keyCode==KeyEvent.KEYCODE_DPAD_UP)"next"else"previous")};return true
      }
      if(!live && event.keyCode in listOf(KeyEvent.KEYCODE_DPAD_LEFT,KeyEvent.KEYCODE_DPAD_RIGHT) && (wake!=null || nativeId(activity.currentFocus?:owner)=="tv-control:seek-video")){
        if(event.action==KeyEvent.ACTION_DOWN){emit(owner,"NodeCastPlaybackActivity",event.keyCode);emit(owner,"GlowTVSeek",(if(event.keyCode==KeyEvent.KEYCODE_DPAD_LEFT)-10 else 10)*(1+event.repeatCount/4).coerceAtMost(6))};return true
      }
      if (wake != null && !media && event.action==KeyEvent.ACTION_DOWN) {
        wakingKey=event.keyCode; wake.performClick(); return true
      }
      if (event.action==KeyEvent.ACTION_DOWN) emit(owner,"NodeCastPlaybackActivity",event.keyCode)
      if (media) { if(event.action==KeyEvent.ACTION_UP)emit(owner,"NodeCastPlaybackMedia",event.keyCode); return true }
    }
    if(command!=null){if(event.action==KeyEvent.ACTION_UP)emit(choices.first(),"GlowTVRemoteCommand",command);return true}
    if (wakeKey) return false
    if(menuKey){if(event.action==KeyEvent.ACTION_UP)menu(choices);return true;}
    if (direction != null) { if (event.action == KeyEvent.ACTION_DOWN) { move(direction, choices);if(profiled)android.util.Log.d("NodeCastTVRemote","key_us=${(System.nanoTime()-began)/1000} candidates=${choices.size}") }; return true }
    if (media) {
      if (event.action == KeyEvent.ACTION_UP) {
        val labels = when(event.keyCode) {
          KeyEvent.KEYCODE_MEDIA_PLAY -> listOf("Play live TV", "Play video")
          KeyEvent.KEYCODE_MEDIA_PAUSE -> listOf("Pause live TV", "Pause video")
          KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> listOf("Forward 30 seconds")
          KeyEvent.KEYCODE_MEDIA_REWIND -> listOf("Rewind 10 seconds")
          KeyEvent.KEYCODE_MEDIA_STOP -> listOf("Back to library", "Back to TV guide")
          else -> listOf("Pause live TV", "Play live TV", "Pause video", "Play video")
        }
        choices.firstOrNull { it.contentDescription?.toString() in labels }?.performClick()
      }
      return true
    }
    if (event.action == KeyEvent.ACTION_DOWN) { if (event.repeatCount == 0) pressed = activity.currentFocus;else if(event.repeatCount==1){pressed=null;menu(choices)}; return true }
    if (event.action == KeyEvent.ACTION_UP) {
      val target = pressed; pressed = null
      if (target != null && target.isEnabled && allowed(target) && visible(target) && choices.any { it === target }) {
        if(inRail(target)&&nativeId(target)!="tv-control:nav:search")pendingContent=android.os.SystemClock.uptimeMillis()+1500
        target.performClick()
        if (target is EditText) showKeyboard(target)
      }
      return true
    }
    return false
  }
}
