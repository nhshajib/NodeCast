package __PACKAGE__

import android.app.Activity
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

/** Android TV key navigation for the standard React Native renderer, with no touch synthesis. */
class TVRemoteController(private val activity: Activity) {
  private val root get() = activity.window.decorView
  private val remembered = mutableMapOf<String, String>()
  private var pressed: View? = null
  private var scheduled = false
  private var dirty = true
  private var collectedAt=0L
  private var cached = emptyList<View>()
  private var highlighted: View? = null
  private var indicator: LayerDrawable? = null
  private val indicatorLayout = View.OnLayoutChangeListener { view, _, _, _, _, _, _, _, _ ->
    indicator?.setBounds(0,0,view.width,view.height)
  }
  private fun highlight(next: View?) {
    highlighted?.let { old -> indicator?.let { old.overlay.remove(it) };old.removeOnLayoutChangeListener(indicatorLayout) }
    highlighted=null;indicator=null
    if(next==null||!actionable(next))return
    val dp=next.resources.displayMetrics.density
    fun line(color:String,width:Float)=GradientDrawable().apply { setColor(Color.TRANSPARENT);cornerRadius=12*dp;setStroke((width*dp).toInt().coerceAtLeast(1),Color.parseColor(color)) }
    val ring=LayerDrawable(arrayOf(line("#FFFFFF",3f),line("#887BD8",2f)))
    val inset=(3*dp).toInt();ring.setLayerInset(1,inset,inset,inset,inset)
    ring.setBounds(0,0,next.width,next.height);next.overlay.add(ring)
    next.addOnLayoutChangeListener(indicatorLayout);highlighted=next;indicator=ring
  }
  private val arrows = mapOf(KeyEvent.KEYCODE_DPAD_UP to View.FOCUS_UP, KeyEvent.KEYCODE_DPAD_DOWN to View.FOCUS_DOWN,
    KeyEvent.KEYCODE_DPAD_LEFT to View.FOCUS_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT to View.FOCUS_RIGHT)
  init {
    root.viewTreeObserver.addOnGlobalFocusChangeListener { _, next ->
      highlight(next)
      if (next != null && allowed(next)) nativeId(next)?.let { remembered[scope(next)] = it; if(remembered.size>300)remembered.remove(remembered.keys.first()) }
    }
    root.viewTreeObserver.addOnGlobalLayoutListener {
      dirty=true
      if (!scheduled) {
        scheduled = true
        root.postDelayed({ scheduled = false; ensureFocus() },80)
      }
    }
  }
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
    val views = mutableListOf<View>(); val occluders=mutableListOf<View>(); var trap: View? = null
    fun visit(view: View) {
      if (!view.isAttachedToWindow || view.visibility!=View.VISIBLE || view.alpha<=.01f || view.importantForAccessibility==View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) return
      if (nativeId(view)?.startsWith("tv-trap:") == true) trap = view
      if (nativeId(view)?.startsWith("tv-scope:mini") == true) occluders.add(view)
      if (view.width>0&&view.height>0&&view.isEnabled&&view.isFocusable&&(view is com.facebook.react.views.view.ReactViewGroup&&view.isClickable||view is EditText&&view.keyListener!=null)) views.add(view)
      if (view is ViewGroup) for (i in 0 until view.childCount) visit(view.getChildAt(i))
    }
    visit(root)
    val active = trap
    cached = views.filter { view -> (active == null || inside(view,active)) && occluders.none { cover -> !inside(view,cover) && rect(cover).contains(rect(view).centerX(),rect(view).centerY()) } }
    return cached
  }
  private fun rect(view: View): Rect {
    val position = IntArray(2); view.getLocationOnScreen(position)
    return Rect(position[0], position[1], position[0] + view.width, position[1] + view.height)
  }
  private fun visible(view: View): Boolean { val r = Rect(); return view.getGlobalVisibleRect(r) && r.width() > 8 && r.height() > 8 }
  private fun focus(view: View) {
    view.isFocusableInTouchMode = true
    view.requestRectangleOnScreen(Rect(0, 0, view.width, view.height), true)
    view.requestFocus()
  }
  private fun imeVisible(): Boolean {
    if (android.os.Build.VERSION.SDK_INT >= 30 && root.rootWindowInsets?.isVisible(android.view.WindowInsets.Type.ime()) == true) return true
    val frame = Rect(); root.getWindowVisibleDisplayFrame(frame)
    return root.height - frame.bottom > root.height / 4
  }
  fun onWindowFocus() { dirty=true;root.post { ensureFocus();highlight(activity.currentFocus) } }
  private fun ensureFocus(): List<View> {
    val choices = candidates()
    if (!root.hasWindowFocus()) return choices
    if (choices.any { it === activity.currentFocus }) return choices
    val shown = choices.filter { visible(it) }
    val restored = choices.firstOrNull { nativeId(it) == remembered[scope(it)] }
    val preferred = shown.firstOrNull { nativeId(it)?.startsWith("tv-preferred:") == true }
    (restored ?: preferred ?: shown.firstOrNull())?.let { focus(it) }
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
      val target=if(sign>0)shown.minByOrNull { if(horizontal)rect(it).left else rect(it).top }
        else shown.maxByOrNull { if(horizontal)rect(it).right else rect(it).bottom }
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
  private fun move(direction: Int, choices: List<View>): Boolean {
    val from = activity.currentFocus ?: return true
    val horizontal = direction == View.FOCUS_LEFT || direction == View.FOCUS_RIGHT
    val positive = direction == View.FOCUS_RIGHT || direction == View.FOCUS_DOWN
    val a = rect(from); val scroll = scroller(from, horizontal)
    val rectangles=choices.associateWith { rect(it) }
    val options = choices.filter { target ->
      target !== from && (visible(target) || scroll != null && scroller(target, horizontal) === scroll)
    }.mapNotNull { target ->
      val b = rectangles.getValue(target)
      val primary = if (horizontal) b.centerX() - a.centerX() else b.centerY() - a.centerY()
      if (if (positive) primary <= 2 else primary >= -2) return@mapNotNull null
      val cross = if (horizontal) b.centerY() - a.centerY() else b.centerX() - a.centerX()
      val beam = if (horizontal) b.bottom > a.top && b.top < a.bottom else b.right > a.left && b.left < a.right
      val score = primary.toDouble() * primary + 4.0 * cross * cross + if (beam) 0.0 else 100000.0
      Triple(target, score, beam)
    }
    val best = options.minByOrNull { it.second }
    val sign = if (positive) 1 else -1
    val canScroll = scroll != null && if (horizontal) scroll.canScrollHorizontally(sign) else scroll.canScrollVertically(sign)
    if (canScroll && (best == null || !best.third)) {
      scrollMore(scroll!!,sign,horizontal)
      return true
    }
    if(best==null&&scroll==null)contentScroller(from,horizontal,sign)?.let { scrollMore(it,sign,horizontal);return true }
    best?.let { focus(it.first) }
    return true
  }
  private fun menu(choices: List<View>) {
    val focused=activity.currentFocus?.contentDescription?.toString().orEmpty()
    val channel=if(focused.startsWith("Play "))focused.removePrefix("Play ") else ""
    val target=choices.firstOrNull { channel.isNotEmpty()&&it.contentDescription?.toString()=="Playback options for $channel" }
      ?:choices.firstOrNull { it.contentDescription?.toString()=="Player options" }
      ?:choices.firstOrNull { it.contentDescription?.toString()=="Library options" }
    target?.performClick()
  }
  fun dispatch(event: KeyEvent): Boolean {
    // Native IMEs and native dialogs retain their own key handling.
    if (activity.currentFocus is EditText && imeVisible()) return false
    val direction = arrows[event.keyCode]
    val select = event.keyCode in listOf(KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER, KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_BUTTON_SELECT)
    val media = event.keyCode in listOf(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_REWIND, KeyEvent.KEYCODE_MEDIA_STOP)
    val menuKey=event.keyCode==KeyEvent.KEYCODE_MENU
    if (direction == null && !select && !media && !menuKey) return false
    val profiled=activity.intent.getBooleanExtra("nodecastTvProfile",false)
    val began=if(profiled)System.nanoTime()else 0L
    val choices = ensureFocus()
    if (choices.isEmpty()) return false
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
      if (target != null && target.isEnabled && visible(target) && choices.any { it === target }) {
        target.performClick()
        if (target is EditText) (activity.getSystemService(Activity.INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(target, InputMethodManager.SHOW_IMPLICIT)
      }
      return true
    }
    return false
  }
}
