package com.example.test;

import com.sun.management.HotSpotDiagnosticMXBean;
import jakarta.annotation.PostConstruct;
import java.lang.management.ManagementFactory;
import java.text.SimpleDateFormat;
import java.util.Date;
import javax.management.MBeanServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class HeapDumpOnShutdown {

    private static final Logger logger = LoggerFactory.getLogger(HeapDumpOnShutdown.class);
    private static final String HOTSPOT_BEAN_NAME = "com.sun.management:type=HotSpotDiagnostic";
    private volatile HotSpotDiagnosticMXBean hotspotMBean;

    @PostConstruct
    public void registerShutdownHook() {
        Thread hook = new Thread(() -> {
            logger.warn("****************************************************************");
            logger.warn("** SHUTDOWN SIGNAL DETECTED. Generating heap dump before exit. **");
            logger.warn("****************************************************************");
            dumpHeap();
        });
        Runtime.getRuntime().addShutdownHook(hook);
        logger.info("Heap dump on shutdown hook registered.");
    }

    private void dumpHeap() {
        try {
            if (hotspotMBean == null) {
                MBeanServer server = ManagementFactory.getPlatformMBeanServer();
                hotspotMBean = ManagementFactory.newPlatformMXBeanProxy(server,
                        HOTSPOT_BEAN_NAME, HotSpotDiagnosticMXBean.class);
            }
            String timestamp = new SimpleDateFormat("yyyy-MM-dd-HH-mm-ss").format(new Date());
            String filePath = "heapdump-" + timestamp + ".hprof";

            logger.info("Dumping heap to file: {}", filePath);
            hotspotMBean.dumpHeap(filePath, true); // true for live objects only
            logger.info("Heap dump complete.");

        } catch (Exception e) {
            logger.error("Failed to generate heap dump.", e);
        }
    }
}
