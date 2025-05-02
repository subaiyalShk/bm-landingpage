document.addEventListener('DOMContentLoaded', function() {
    // Scroll to download function
    window.scrollToDownload = function() {
        const targetSection = document.getElementById('features');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    };

    // Header scroll effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        header.style.backgroundColor = window.scrollY > 50 
            ? 'rgba(34, 49, 56, 0.95)' 
            : '#223138';
    });

    // Feature cards animation
    const featureObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        featureObserver.observe(card);
    });

    // Video Text Synchronization Class
    class VideoTextSync {
        constructor({ videoId, stepsSelector }) {
            this.video = document.getElementById(videoId);
            if (!this.video) {
                console.warn(`Video element with id ${videoId} not found`);
                return;
            }
            this.steps = document.querySelectorAll(stepsSelector);
            this.currentStep = -1;
            this.initialized = false;

            // Bind methods
            this.checkTime = this.checkTime.bind(this);
            this.initializeSync = this.initializeSync.bind(this);
            
            // Add event listeners
            this.video.addEventListener('loadedmetadata', this.initializeSync);
            this.video.addEventListener('timeupdate', this.checkTime);
            this.video.addEventListener('play', () => {
                if (!this.initialized) this.initializeSync();
            });

            // Handle cleanup when video is removed from view
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting && this.initialized) {
                        this.resetSteps();
                    }
                });
            });
            this.observer.observe(this.video);
        }

        initializeSync() {
            if (this.initialized) return;
            
            const duration = this.video.duration;
            if (!duration || isNaN(duration)) {
                console.warn('Video duration not available');
                return;
            }

            this.segmentDuration = duration / this.steps.length;
            this.showStep(0);
            this.initialized = true;
        }

        showStep(index) {
            if (this.currentStep === index) return;
            
            // Hide all steps with a stagger
            this.steps.forEach(step => {
                step.classList.remove('active');
            });
            
            // Show the new step
            if (this.steps[index]) {
                this.steps[index].classList.add('active');
                this.currentStep = index;
            }
        }

        resetSteps() {
            this.steps.forEach(step => step.classList.remove('active'));
            this.currentStep = -1;
        }

        checkTime() {
            if (!this.initialized) return;

            const currentTime = this.video.currentTime;
            const currentSegment = Math.floor(currentTime / this.segmentDuration);
            
            if (currentSegment !== this.currentStep && currentSegment < this.steps.length) {
                this.showStep(currentSegment);
            }
        }

        destroy() {
            if (this.video) {
                this.video.removeEventListener('loadedmetadata', this.initializeSync);
                this.video.removeEventListener('timeupdate', this.checkTime);
                this.observer.disconnect();
            }
            this.resetSteps();
        }
    }

    // Video Viewport Management Class
    class ViewportVideoManager {
        constructor() {
            this.videos = new Map();
            this.observer = null;
            this.initializeObserver();
            this.initializeVideos();
            
            // Bind the check visibility method
            this.checkVideoVisibility = this.checkVideoVisibility.bind(this);
            
            // Add scroll and resize listeners
            window.addEventListener('scroll', this.checkVideoVisibility, { passive: true });
            window.addEventListener('resize', this.checkVideoVisibility, { passive: true });
        }

        initializeObserver() {
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        const video = entry.target;
                        if (entry.isIntersecting) {
                            this.checkVideoVisibility();
                        } else {
                            this.pauseVideo(video);
                        }
                    });
                },
                {
                    threshold: [0, 0.25, 0.5, 0.75, 1],
                    rootMargin: '-10% 0px'
                }
            );
        }

        initializeVideos() {
            document.querySelectorAll('video').forEach(video => {
                this.videos.set(video, { isPlaying: false });
                video.playsInline = true;
                video.muted = true;
                video.loop = true;
                this.observer.observe(video);

                // Add error handling
                video.addEventListener('error', (e) => {
                    console.warn(`Video error for ${video.id}:`, e);
                });
            });
        }

        isElementInCenter(element) {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const elementCenter = (rect.top + rect.bottom) / 2;
            return elementCenter > windowHeight * 0.25 && elementCenter < windowHeight * 0.75;
        }

        async playVideo(video) {
            const videoData = this.videos.get(video);
            if (!videoData || videoData.isPlaying) return;
            
            try {
                await video.play();
                videoData.isPlaying = true;
                this.videos.set(video, videoData);
            } catch (error) {
                console.warn(`Error playing video:`, error);
            }
        }

        pauseVideo(video) {
            const videoData = this.videos.get(video);
            if (!videoData || !videoData.isPlaying) return;
            
            try {
                video.pause();
                videoData.isPlaying = false;
                this.videos.set(video, videoData);
            } catch (error) {
                console.warn(`Error pausing video:`, error);
            }
        }

        checkVideoVisibility() {
            requestAnimationFrame(() => {
                this.videos.forEach((data, video) => {
                    if (this.isElementInCenter(video)) {
                        this.playVideo(video);
                    } else {
                        this.pauseVideo(video);
                    }
                });
            });
        }

        destroy() {
            window.removeEventListener('scroll', this.checkVideoVisibility);
            window.removeEventListener('resize', this.checkVideoVisibility);
            this.videos.forEach((_, video) => {
                this.observer.unobserve(video);
                this.pauseVideo(video);
            });
            this.videos.clear();
            this.observer.disconnect();
        }
    }

    // Initialize managers
    const onboardingSync = new VideoTextSync({
        videoId: 'onboardingVideo',
        stepsSelector: '#onboarding-showcase .step'
    });
    
    const nutritionistSync = new VideoTextSync({
        videoId: 'mealplanVideo',
        stepsSelector: '#nutritionist-showcase .step'
    });

    const trainingSync = new VideoTextSync({
        videoId: 'trainingVideo',
        stepsSelector: '#trainer-showcase .step'
    });

    const viewportManager = new ViewportVideoManager();

    // Clean up on page unload
    window.addEventListener('unload', () => {
        onboardingSync.destroy();
        nutritionistSync.destroy();
        trainingSync.destroy();
        viewportManager.destroy();
    });

    // Sticky navigation
    const nav = document.getElementById('main-nav');
    const hero = document.querySelector('.hero');
    let isTransitioning = false;
    
    // Store initial navbar height for consistent trigger point calculation
    const initialNavHeight = nav.offsetHeight;
    const triggerPoint = hero.offsetHeight - initialNavHeight;

    function handleNav() {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Use the stored triggerPoint instead of recalculating
        if (scrollPosition >= triggerPoint) {
            if (!nav.classList.contains('sticky')) {
                nav.classList.add('sticky');
            }
        } else {
            if (nav.classList.contains('sticky')) {
                nav.classList.remove('sticky');
            }
        }
    }

    // Use requestAnimationFrame for smooth scrolling
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleNav();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // Handle window resize
    window.addEventListener('resize', () => {
        // Recalculate trigger point when window is resized
        triggerPoint = hero.offsetHeight - initialNavHeight;
    }, { passive: true });

    // Initial check
    handleNav();

    // Form submission
    const form = document.querySelector('.cta-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            userType: document.getElementById('userType').value,
            interest: document.getElementById('interest').value
        };

        try {
            const response = await fetch('https://admin.tracerlabs.io/api/beastmode-earlyaccess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                alert('Thank you for your interest! We\'ll be in touch soon.');
                form.reset();
            } else {
                throw new Error(result.error || 'Failed to submit form');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Sorry, there was an error submitting your request. Please try again.');
        }
    });

    // Optimize video loading
    function setupLazyVideos() {
        const videos = document.querySelectorAll('video[data-src]');
        
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target;
                    const src = video.getAttribute('data-src');
                    
                    if (src) {
                        const source = document.createElement('source');
                        source.src = src;
                        source.type = 'video/mp4';
                        video.appendChild(source);
                        video.removeAttribute('data-src');
                        
                        // Start loading the video
                        video.load();
                        videoObserver.unobserve(video);
                    }
                }
            });
        }, { rootMargin: '200px 0px' });
        
        videos.forEach(video => {
            videoObserver.observe(video);
        });
    }
    
    setupLazyVideos();

    // Optimize IntersectionObserver usage
    const observerOptions = {
        rootMargin: '100px',
        threshold: 0.1
    };

    // Debounce function for expensive operations
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Apply debounce to resize handler
    const debouncedResize = debounce(() => {
        triggerPoint = hero.offsetHeight - initialNavHeight;
    }, 150);

    window.addEventListener('resize', debouncedResize, { passive: true });

    // Register service worker for offline capabilities
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
}); 