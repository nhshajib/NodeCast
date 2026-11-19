import android.app.UiAutomation;
import android.graphics.Rect;
import android.os.HandlerThread;
import android.os.Looper;
import android.view.accessibility.AccessibilityNodeInfo;
import android.accessibilityservice.AccessibilityServiceInfo;
import java.lang.reflect.Constructor;

/** Test-only shell client. Reads the current hierarchy without UIAutomator's
 * 10-second idle wait, which exceeds the player's unchanged 4-second timer. */
public final class FastHierarchy {
  private static String escape(CharSequence value) {
    if (value == null) return "";
    return value.toString().replace("&", "&amp;").replace("\"", "&quot;")
      .replace("<", "&lt;").replace(">", "&gt;").replace("\n", "&#10;");
  }
  private static void attr(StringBuilder xml, String key, Object value) {
    xml.append(' ').append(key).append("=\"").append(escape(String.valueOf(value))).append('"');
  }
  private static void node(StringBuilder xml, AccessibilityNodeInfo n) {
    if (n == null) return;
    Rect box = new Rect(); n.getBoundsInScreen(box);
    xml.append("<node");
    attr(xml,"text",n.getText()==null?"":n.getText());
    attr(xml,"content-desc",n.getContentDescription()==null?"":n.getContentDescription());
    attr(xml,"resource-id",n.getViewIdResourceName()==null?"":n.getViewIdResourceName());
    attr(xml,"class",n.getClassName()); attr(xml,"package",n.getPackageName());
    attr(xml,"clickable",n.isClickable()); attr(xml,"focused",n.isFocused());
    attr(xml,"focusable",n.isFocusable()); attr(xml,"selected",n.isSelected());
    attr(xml,"enabled",n.isEnabled()); attr(xml,"password",n.isPassword());
    attr(xml,"scrollable",n.isScrollable()); attr(xml,"checked",n.isChecked());
    attr(xml,"bounds","["+box.left+","+box.top+"]["+box.right+","+box.bottom+"]");
    xml.append('>');
    for(int i=0;i<n.getChildCount();i++) node(xml,n.getChild(i));
    xml.append("</node>");
  }
  public static void main(String[] args) throws Exception {
    Looper.prepareMainLooper();
    HandlerThread thread = new HandlerThread("glowtv-test-hierarchy"); thread.start();
    UiAutomation automation = null;
    try {
      Class<?> connectionType = Class.forName("android.app.IUiAutomationConnection");
      Constructor<?> connectionCtor = Class.forName("android.app.UiAutomationConnection").getDeclaredConstructor();
      connectionCtor.setAccessible(true);
      Constructor<UiAutomation> ctor = UiAutomation.class.getDeclaredConstructor(Looper.class,connectionType);
      ctor.setAccessible(true);
      automation = ctor.newInstance(thread.getLooper(),connectionCtor.newInstance());
      UiAutomation.class.getDeclaredMethod("connect").invoke(automation);
      AccessibilityServiceInfo info=automation.getServiceInfo();
      info.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
      automation.setServiceInfo(info);
      AccessibilityNodeInfo root=null;
      for(int i=0;i<20 && root==null;i++){root=automation.getRootInActiveWindow();if(root==null)Thread.sleep(50);}
      if(root==null)throw new IllegalStateException("No active native window");
      StringBuilder xml=new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><hierarchy>");
      node(xml,root);xml.append("</hierarchy>");System.out.println(xml);
    } finally {if(automation!=null)UiAutomation.class.getDeclaredMethod("disconnect").invoke(automation);thread.quitSafely();}
  }
}
