package gromnitsky.forvolight;

import android.os.Bundle;
import org.apache.cordova.*;

public class MainActivity extends CordovaActivity
{
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        super.init();
        // Set by <content src="index.html" /> in config.xml
        loadUrl(launchUrl);
	// re-enable scrollbars
	super.appView.setVerticalScrollBarEnabled(true);
	super.appView.setHorizontalScrollBarEnabled(true);
    }
}
