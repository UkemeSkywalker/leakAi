// LeakAI Performance Monitor
// Monitors performance metrics and implements optimization strategies

(function() {
    'use strict';

    /**
     * PerformanceMonitor class - Monitors and optimizes extension performance
     */
    class PerformanceMonitor {
        constructor() {
            this.metrics = new Map(); // Performance metrics storage
            this.timers = new Map(); // Active timers
            this.memoryUsage = []; // Memory usage history
            this.maxMemoryHistory = 50; // Keep last 50 memory measurements
            this.performanceThresholds = {
                detection: 100, // Max 100ms for detection
                ui: 50, // Max 50ms for UI operations
                storage: 200, // Max 200ms for storage operations
                memory: 50 * 1024 * 1024 // Max 50MB memory usage
            };
            this.optimizationStrategies = new Map(); // Active optimization strategies
            this.debounceTimers = new Map(); // Debounce timers for performance
            this.throttleTimers = new Map(); // Throttle timers for performance
            
            // Initialize performance monitoring
            this.initializeMonitoring();
            
            this.log('PerformanceMonitor initialized');
        }

        /**
         * Initialize performance monitoring
         */
        initializeMonitoring() {
            // Monitor memory usage periodically
            this.startMemoryMonitoring();
            
            // Set up performance observers if available
            this.setupPerformanceObservers();
            
            // Initialize optimization strategies
            this.initializeOptimizationStrategies();
        }

        /**
         * Start monitoring memory usage
         */
        startMemoryMonitoring() {
            const monitorMemory = () => {
                try {
                    const memoryInfo = this.getMemoryInfo();
                    if (memoryInfo) {
                        this.recordMemoryUsage(memoryInfo);
                        this.checkMemoryThresholds(memoryInfo);
                    }
                } catch (error) {
                    this.error('Memory monitoring failed:', error);
                }
            };

            // Monitor every 30 seconds
            setInterval(monitorMemory, 30000);
            
            // Initial measurement
            monitorMemory();
        }

        /**
         * Set up performance observers
         */
        setupPerformanceObservers() {
            try {
                if (typeof window !== 'undefined' && window.PerformanceObserver) {
                    // Observe long tasks
                    const longTaskObserver = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            this.recordLongTask(entry);
                        }
                    });
                    longTaskObserver.observe({ entryTypes: ['longtask'] });
                    
                    // Observe measures
                    const measureObserver = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            this.recordMeasure(entry);
                        }
                    });
                    measureObserver.observe({ entryTypes: ['measure'] });
                    
                    this.log('Performance observers set up');
                }
            } catch (error) {
                this.warn('Failed to set up performance observers:', error);
            }
        }

        /**
         * Initialize optimization strategies
         */
        initializeOptimizationStrategies() {
            // Cache optimization
            this.optimizationStrategies.set('cache', {
                enabled: true,
                maxSize: 1000,
                ttl: 300000, // 5 minutes
                cleanupInterval: 60000 // 1 minute
            });

            // Debounce optimization
            this.optimizationStrategies.set('debounce', {
                enabled: true,
                defaultDelay: 300,
                maxDelay: 1000
            });

            // Throttle optimization
            this.optimizationStrategies.set('throttle', {
                enabled: true,
                defaultDelay: 100,
                maxDelay: 500
            });

            // Memory cleanup optimization
            this.optimizationStrategies.set('memoryCleanup', {
                enabled: true,
                interval: 120000, // 2 minutes
                threshold: 0.8 // 80% of max memory
            });

            this.log('Optimization strategies initialized');
        }

        /**
         * Start timing a performance measurement
         * @param {string} name - Name of the measurement
         * @param {Object} context - Additional context
         */
        startTiming(name, context = {}) {
            const startTime = performance.now();
            this.timers.set(name, {
                startTime,
                context,
                id: this.generateTimerId()
            });
            
            // Also use Performance API if available
            if (typeof performance !== 'undefined' && performance.mark) {
                performance.mark(`${name}-start`);
            }
        }

        /**
         * End timing a performance measurement
         * @param {string} name - Name of the measurement
         * @returns {number} Duration in milliseconds
         */
        endTiming(name) {
            const timer = this.timers.get(name);
            if (!timer) {
                this.warn(`No timer found for: ${name}`);
                return 0;
            }

            const endTime = performance.now();
            const duration = endTime - timer.startTime;
            
            // Record the measurement
            this.recordMetric(name, duration, timer.context);
            
            // Use Performance API if available
            if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
                performance.mark(`${name}-end`);
                performance.measure(name, `${name}-start`, `${name}-end`);
            }
            
            // Clean up timer
            this.timers.delete(name);
            
            // Check performance thresholds
            this.checkPerformanceThresholds(name, duration);
            
            return duration;
        }

        /**
         * Record a performance metric
         * @param {string} name - Metric name
         * @param {number} value - Metric value
         * @param {Object} context - Additional context
         */
        recordMetric(name, value, context = {}) {
            const metric = {
                name,
                value,
                timestamp: Date.now(),
                context,
                id: this.generateMetricId()
            };

            // Store metric
            if (!this.metrics.has(name)) {
                this.metrics.set(name, []);
            }
            
            const metricHistory = this.metrics.get(name);
            metricHistory.push(metric);
            
            // Keep only recent metrics (last 100)
            if (metricHistory.length > 100) {
                metricHistory.shift();
            }
            
            this.log(`Recorded metric ${name}: ${value}ms`);
        }

        /**
         * Get memory information
         * @returns {Object|null} Memory information
         */
        getMemoryInfo() {
            try {
                if (typeof performance !== 'undefined' && performance.memory) {
                    return {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit,
                        timestamp: Date.now()
                    };
                }
                return null;
            } catch (error) {
                this.error('Failed to get memory info:', error);
                return null;
            }
        }

        /**
         * Record memory usage
         * @param {Object} memoryInfo - Memory information
         */
        recordMemoryUsage(memoryInfo) {
            this.memoryUsage.push(memoryInfo);
            
            // Keep only recent memory measurements
            if (this.memoryUsage.length > this.maxMemoryHistory) {
                this.memoryUsage.shift();
            }
            
            this.log(`Memory usage: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB`);
        }

        /**
         * Check memory thresholds and trigger cleanup if needed
         * @param {Object} memoryInfo - Memory information
         */
        checkMemoryThresholds(memoryInfo) {
            const memoryUsageRatio = memoryInfo.used / memoryInfo.limit;
            const strategy = this.optimizationStrategies.get('memoryCleanup');
            
            if (strategy && strategy.enabled && memoryUsageRatio > strategy.threshold) {
                this.warn(`High memory usage detected: ${(memoryUsageRatio * 100).toFixed(1)}%`);
                this.triggerMemoryCleanup();
            }
        }

        /**
         * Check performance thresholds
         * @param {string} name - Metric name
         * @param {number} duration - Duration in milliseconds
         */
        checkPerformanceThresholds(name, duration) {
            let threshold = null;
            
            // Determine threshold based on operation type
            if (name.includes('detect')) {
                threshold = this.performanceThresholds.detection;
            } else if (name.includes('ui') || name.includes('render')) {
                threshold = this.performanceThresholds.ui;
            } else if (name.includes('storage') || name.includes('save') || name.includes('load')) {
                threshold = this.performanceThresholds.storage;
            }
            
            if (threshold && duration > threshold) {
                this.warn(`Performance threshold exceeded for ${name}: ${duration}ms > ${threshold}ms`);
                this.triggerPerformanceOptimization(name, duration);
            }
        }

        /**
         * Record long task
         * @param {PerformanceEntry} entry - Performance entry
         */
        recordLongTask(entry) {
            this.warn(`Long task detected: ${entry.name} (${entry.duration}ms)`);
            this.recordMetric('longtask', entry.duration, {
                name: entry.name,
                startTime: entry.startTime
            });
        }

        /**
         * Record performance measure
         * @param {PerformanceEntry} entry - Performance entry
         */
        recordMeasure(entry) {
            this.recordMetric(entry.name, entry.duration, {
                startTime: entry.startTime,
                type: 'measure'
            });
        }

        /**
         * Trigger memory cleanup
         */
        triggerMemoryCleanup() {
            try {
                this.log('Triggering memory cleanup');
                
                // Clear old cache entries
                this.cleanupCaches();
                
                // Clear old metrics
                this.cleanupMetrics();
                
                // Clear old memory usage history
                this.cleanupMemoryHistory();
                
                // Trigger garbage collection if available
                if (typeof window !== 'undefined' && window.gc) {
                    window.gc();
                    this.log('Triggered garbage collection');
                }
                
                this.log('Memory cleanup completed');
            } catch (error) {
                this.error('Memory cleanup failed:', error);
            }
        }

        /**
         * Trigger performance optimization
         * @param {string} operationName - Name of the slow operation
         * @param {number} duration - Duration that exceeded threshold
         */
        triggerPerformanceOptimization(operationName, duration) {
            try {
                this.log(`Triggering performance optimization for ${operationName}`);
                
                // Enable more aggressive caching
                if (operationName.includes('detect')) {
                    this.optimizeDetectionPerformance();
                }
                
                // Enable UI throttling
                if (operationName.includes('ui') || operationName.includes('render')) {
                    this.optimizeUIPerformance();
                }
                
                // Enable storage batching
                if (operationName.includes('storage')) {
                    this.optimizeStoragePerformance();
                }
                
            } catch (error) {
                this.error('Performance optimization failed:', error);
            }
        }

        /**
         * Optimize detection performance
         */
        optimizeDetectionPerformance() {
            // Increase cache TTL for detection results
            const cacheStrategy = this.optimizationStrategies.get('cache');
            if (cacheStrategy) {
                cacheStrategy.ttl = Math.min(cacheStrategy.ttl * 1.5, 600000); // Max 10 minutes
                this.log('Increased detection cache TTL');
            }
            
            // Enable more aggressive debouncing
            const debounceStrategy = this.optimizationStrategies.get('debounce');
            if (debounceStrategy) {
                debounceStrategy.defaultDelay = Math.min(debounceStrategy.defaultDelay * 1.2, debounceStrategy.maxDelay);
                this.log('Increased detection debounce delay');
            }
        }

        /**
         * Optimize UI performance
         */
        optimizeUIPerformance() {
            // Enable UI throttling
            const throttleStrategy = this.optimizationStrategies.get('throttle');
            if (throttleStrategy) {
                throttleStrategy.defaultDelay = Math.min(throttleStrategy.defaultDelay * 1.5, throttleStrategy.maxDelay);
                this.log('Increased UI throttle delay');
            }
        }

        /**
         * Optimize storage performance
         */
        optimizeStoragePerformance() {
            // Enable storage batching (would be implemented in storage layer)
            this.log('Storage performance optimization triggered');
        }

        /**
         * Clean up caches
         */
        cleanupCaches() {
            // Clean up detection engine cache
            if (typeof window !== 'undefined' && window.LeakAI && window.LeakAI.detectionEngine) {
                const engine = window.LeakAI.detectionEngine;
                if (engine.clearCache) {
                    engine.clearCache();
                    this.log('Cleared detection engine cache');
                }
            }
            
            // Clean up other caches
            this.cleanupOldCacheEntries();
        }

        /**
         * Clean up old cache entries
         */
        cleanupOldCacheEntries() {
            const now = Date.now();
            const cacheStrategy = this.optimizationStrategies.get('cache');
            
            if (cacheStrategy) {
                // This would clean up any internal caches
                this.log('Cleaned up old cache entries');
            }
        }

        /**
         * Clean up old metrics
         */
        cleanupMetrics() {
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
            
            for (const [name, metrics] of this.metrics) {
                const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
                this.metrics.set(name, filteredMetrics);
            }
            
            this.log('Cleaned up old metrics');
        }

        /**
         * Clean up memory history
         */
        cleanupMemoryHistory() {
            // Keep only the most recent memory measurements
            const keepCount = Math.floor(this.maxMemoryHistory / 2);
            this.memoryUsage = this.memoryUsage.slice(-keepCount);
            this.log('Cleaned up memory history');
        }

        /**
         * Debounce a function call
         * @param {Function} func - Function to debounce
         * @param {number} delay - Delay in milliseconds
         * @param {string} key - Unique key for the debounce
         * @returns {Function} Debounced function
         */
        debounce(func, delay, key) {
            return (...args) => {
                const existingTimer = this.debounceTimers.get(key);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }
                
                const timer = setTimeout(() => {
                    func.apply(this, args);
                    this.debounceTimers.delete(key);
                }, delay);
                
                this.debounceTimers.set(key, timer);
            };
        }

        /**
         * Throttle a function call
         * @param {Function} func - Function to throttle
         * @param {number} delay - Delay in milliseconds
         * @param {string} key - Unique key for the throttle
         * @returns {Function} Throttled function
         */
        throttle(func, delay, key) {
            return (...args) => {
                const existingTimer = this.throttleTimers.get(key);
                if (existingTimer) {
                    return; // Skip this call
                }
                
                func.apply(this, args);
                
                const timer = setTimeout(() => {
                    this.throttleTimers.delete(key);
                }, delay);
                
                this.throttleTimers.set(key, timer);
            };
        }

        /**
         * Get performance statistics
         * @returns {Object} Performance statistics
         */
        getPerformanceStats() {
            const stats = {
                metrics: {},
                memory: {
                    current: this.memoryUsage[this.memoryUsage.length - 1],
                    history: this.memoryUsage.slice(-10), // Last 10 measurements
                    average: this.calculateAverageMemoryUsage()
                },
                activeTimers: this.timers.size,
                optimizations: Object.fromEntries(this.optimizationStrategies)
            };
            
            // Calculate metric statistics
            for (const [name, metrics] of this.metrics) {
                if (metrics.length > 0) {
                    const values = metrics.map(m => m.value);
                    stats.metrics[name] = {
                        count: metrics.length,
                        average: values.reduce((sum, val) => sum + val, 0) / values.length,
                        min: Math.min(...values),
                        max: Math.max(...values),
                        recent: metrics.slice(-5) // Last 5 measurements
                    };
                }
            }
            
            return stats;
        }

        /**
         * Calculate average memory usage
         * @returns {number} Average memory usage in bytes
         */
        calculateAverageMemoryUsage() {
            if (this.memoryUsage.length === 0) return 0;
            
            const totalUsage = this.memoryUsage.reduce((sum, usage) => sum + usage.used, 0);
            return totalUsage / this.memoryUsage.length;
        }

        /**
         * Generate unique timer ID
         * @returns {string} Timer ID
         */
        generateTimerId() {
            return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Generate unique metric ID
         * @returns {string} Metric ID
         */
        generateMetricId() {
            return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Reset all performance data
         */
        resetPerformanceData() {
            this.metrics.clear();
            this.timers.clear();
            this.memoryUsage = [];
            this.debounceTimers.clear();
            this.throttleTimers.clear();
            this.log('Performance data reset');
        }

        /**
         * Logging methods that respect extension state
         */
        log(message, ...args) {
            if (typeof window !== 'undefined' && window.LeakAILogger) {
                window.LeakAILogger.log(`[PerformanceMonitor] ${message}`, ...args);
            } else {
                console.log(`[PerformanceMonitor] ${message}`, ...args);
            }
        }

        warn(message, ...args) {
            if (typeof window !== 'undefined' && window.LeakAILogger) {
                window.LeakAILogger.warn(`[PerformanceMonitor] ${message}`, ...args);
            } else {
                console.warn(`[PerformanceMonitor] ${message}`, ...args);
            }
        }

        error(message, ...args) {
            // Always log errors regardless of extension state
            console.error(`[PerformanceMonitor] ${message}`, ...args);
        }
    }

    // Export for both Node.js and browser environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PerformanceMonitor;
    } else if (typeof window !== 'undefined') {
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.PerformanceMonitor = PerformanceMonitor;
        
        // Create global performance monitor instance
        window.LeakAI.performanceMonitor = new PerformanceMonitor();
        
        console.log('LeakAI PerformanceMonitor loaded');
    }
})();