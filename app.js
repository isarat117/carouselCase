(() => {
    class ProductCarousel {
        constructor() {
            this.currentIndex = 0;
            this.track = null;
            this.items = null;
            this.totalItems = 0;
            this.isDragging = false;
            this.startPos = 0;
            this.currentTranslate = 0;
            this.prevTranslate = 0;
            this.animationID = 0;
            this.currentPosition = 0;
        }

        init(products) {
            if (!products.length) {
                return '<div class="no-products">No Products Found</div>';
            }

            const html = this.generateCarouselHTML(products);
            $('#app').html(html);
            this.setupCarousel();
            this.setupTouchEvents();
        }

        setupTouchEvents() {
            this.track.on('mousedown touchstart', (e) => this.touchStart(e));
            $(document).on('mousemove touchmove', (e) => this.touchMove(e));
            $(document).on('mouseup touchend', () => this.touchEnd());
            this.track.on('contextmenu', (e) => e.preventDefault());
        }

        touchStart(event) {
            this.isDragging = true;
            this.startPos = this.getPositionX(event);
            this.animationID = requestAnimationFrame(this.animation.bind(this));
            this.track.css('cursor', 'grabbing');
            this.track.css('transition', 'none');
        }

        touchMove(event) {
            if (!this.isDragging) return;
            event.preventDefault();
            const currentPosition = this.getPositionX(event);
            this.currentTranslate = this.prevTranslate + currentPosition - this.startPos;
        }

        touchEnd() {
            this.isDragging = false;
            cancelAnimationFrame(this.animationID);
            this.track.css('cursor', 'grab');
            this.track.css('transition', 'transform 0.3s ease');

            const movedBy = this.currentTranslate - this.prevTranslate;

            if (Math.abs(movedBy) > 100) {
                if (movedBy < 0) {
                    this.navigate('next');
                } else {
                    this.navigate('prev');
                }
            } else {
                this.updateCarousel();
            }
        }

        getPositionX(event) {
            return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        }

        animation() {
            if (this.isDragging) {
                this.setSliderPosition();
                requestAnimationFrame(this.animation.bind(this));
            }
        }

        setSliderPosition() {
            this.track.css('transform', `translateX(${this.currentTranslate}px)`);
        }

        generateCarouselHTML(products) {
            return `
                <div class="product-carousel">
                  <button class="carousel-arrow prev-arrow">&lt;</button>
                    <div class="carousel-container">
                      
                        <div class="carousel-track">
                            ${products.map(product => this.generateProductCard(product)).join('')}
                        </div>
                       
                    </div>
                     <button class="carousel-arrow next-arrow">&gt;</button>
                    <div class="carousel-indicators">
                        ${products.map((_, index) => `
                            <div class="carousel-line ${index === 0 ? 'active' : ''}" style="cursor: pointer"></div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        generateProductCard(product) {
            return `
                <div class="carousel-item">
                    <div class="product-card">
                        <img src="${product.image}" alt="${product.name}" loading="lazy" draggable="false">
                        <h3>${product.name}</h3>
                        <div class="price-container">
                            ${product.oldPrice ? 
                                `<span class="original-price">${product.oldPriceText}</span>` : 
                                ''
                            }
                            <span class="current-price">${product.priceText}</span>
                        </div>
                        <a href="${product.url}" class="view-product" target="_blank">VIEW PRODUCT</a>
                    </div>
                </div>
            `;
        }

        setupCarousel() {
            this.track = $('.carousel-track');
            this.items = $('.carousel-item');
            this.totalItems = this.items.length;
            this.track.css('cursor', 'grab');

            $('.prev-arrow').on('click', () => this.navigate('prev'));
            $('.next-arrow').on('click', () => this.navigate('next'));
            
            $('.carousel-line').on('click', (e) => {
                const index = $(e.target).index();
                this.goToSlide(index);
            });
        }

        goToSlide(index) {
            this.currentIndex = index;
            const itemWidth = this.items.first().width();
            this.currentTranslate = -this.currentIndex * itemWidth;
            this.prevTranslate = this.currentTranslate;
            this.track.css('transition', 'transform 0.3s ease');
            this.updateCarousel();
        }

        navigate(direction) {
            const itemWidth = this.items.first().width();
            
            if (direction === 'prev') {
                this.currentIndex = this.currentIndex === 0 ? this.totalItems - 1 : this.currentIndex - 1;
            } else {
                this.currentIndex = this.currentIndex === this.totalItems - 1 ? 0 : this.currentIndex + 1;
            }

            this.prevTranslate = -this.currentIndex * itemWidth;
            this.currentTranslate = this.prevTranslate;
            this.updateCarousel();
        }

        updateCarousel() {
            const itemWidth = this.items.first().width();
            this.currentTranslate = -this.currentIndex * itemWidth;
            this.prevTranslate = this.currentTranslate;
            this.track.css('transform', `translateX(${this.currentTranslate}px)`);
            this.updateIndicators();
        }

        updateIndicators() {
            const totalIndicators = $('.carousel-line').length;
            const realIndex = this.currentIndex % totalIndicators;
            $('.carousel-line').removeClass('active').eq(realIndex).addClass('active');
        }
    }

    class QuizApp {
        constructor() {
            this.currentStep = 0;
            this.selectedAnswers = {};
            this.questions = null;
            this.products = [];
            this.carousel = new ProductCarousel();

            this.colorCodes = {
                'siyah': '#000000',
                'bej': '#E8DCC4',
                'beyaz': '#FFFFFF',
                'mavi': '#0000FF',
                'kırmızı': '#FF0000',
                'yeşil': '#008000'
            };
        }

        async init() {
            this.buildCSS();
            await this.loadData();
            
            if (this.questions) {
                this.renderQuestion();
                this.setupEventListeners();
            } else {
                $('#app').html('<div class="error">Veriler yüklenemedi. Lütfen sayfayı yenileyin.</div>');
            }
        }

        async loadData() {
            try {
                const cachedData = this.loadFromCache();
                if (cachedData) return true;

                const data = await this.fetchData();
                if (data) {
                    this.saveToCache(data);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Veri yükleme hatası:', error);
                return false;
            }
        }

        loadFromCache() {
            const cachedQuestions = localStorage.getItem('questions');
            const cachedProducts = localStorage.getItem('products');

            if (cachedQuestions && cachedProducts) {
                this.questions = JSON.parse(cachedQuestions);
                this.products = JSON.parse(cachedProducts);
                return true;
            }
            return false;
        }

        async fetchData() {
            const [questionsResponse, productsResponse] = await Promise.all([
                fetch('questions.json').then(res => res.json()),
                fetch('products.json').then(res => res.json())
            ]);

            if (questionsResponse && productsResponse) {
                this.questions = questionsResponse;
                this.products = productsResponse;
                return true;
            }
            return false;
        }

        saveToCache(data) {
            localStorage.setItem('questions', JSON.stringify(this.questions));
            localStorage.setItem('products', JSON.stringify(this.products));
        }

        renderQuestion() {
            const currentQuestion = this.questions[0].steps[this.currentStep];
            const isColorQuestion = currentQuestion.type === 'color';
            const totalSteps = this.questions[0].steps.length;

            const html = this.generateQuestionHTML(currentQuestion, isColorQuestion, totalSteps);
            $('#app').html(html);

            this.restorePreviousSelection(isColorQuestion);
        }

        generateQuestionHTML(question, isColorQuestion, totalSteps) {
            return `
                <div class="question-container">
                    <h2 class="question-title">${question.title}</h2>
                    <div class="answers-container ${isColorQuestion ? 'color-answers' : ''}">
                        ${this.generateAnswersHTML(question.answers, isColorQuestion)}
                    </div>
                    ${this.generateProgressIndicators(totalSteps)}
                    ${this.generateNavigationButtons()}
                </div>
            `;
        }

        generateAnswersHTML(answers, isColorQuestion) {
            return answers.map(answer => 
                isColorQuestion ? this.generateColorOption(answer) : this.generateTextOption(answer)
            ).join('');
        }

        generateColorOption(color) {
            return `
                <div class="color-option" data-answer="${color}">
                    <div class="color-circle" style="background-color: ${this.colorCodes[color.toLowerCase()]}">
                        <span class="checkmark">✓</span>
                    </div>
                </div>
            `;
        }

        generateTextOption(answer) {
            return `
                <div class="answer-option" data-answer="${answer}">
                    ${answer}
                </div>
            `;
        }

        generateProgressIndicators(totalSteps) {
            return `
                <div class="progress-indicators">
                    ${Array(totalSteps).fill(0).map((_, index) => `
                        <div class="indicator-line ${index <= this.currentStep ? 'active' : ''}"></div>
                    `).join('')}
                </div>
            `;
        }

        generateNavigationButtons() {
            return `
                <div class="navigation-buttons">
                    <div class="nav-button-container">
                        <button class="nav-button" id="backBtn" ${this.currentStep === 0 ? 'disabled' : ''}>
                            <
                        </button>
                        <span class="button-text">Back</span>
                    </div>
                    <div class="nav-button-container">
                        <button class="nav-button" id="nextBtn" disabled>
                            >
                        </button>
                        <span class="button-text">Next</span>
                    </div>
                </div>
            `;
        }

        restorePreviousSelection(isColorQuestion) {
            if (this.selectedAnswers[this.currentStep]) {
                if (isColorQuestion) {
                    $(`.color-option[data-answer="${this.selectedAnswers[this.currentStep]}"] .color-circle`).addClass('selected');
                } else {
                    $(`.answer-option[data-answer="${this.selectedAnswers[this.currentStep]}"]`).addClass('selected');
                }
                $('#nextBtn').prop('disabled', false);
            }
        }

        setupEventListeners() {
            $(document).on('click', '.answer-option, .color-option', (e) => this.handleAnswerSelection(e));
            $(document).on('click', '#nextBtn', () => this.handleNextButton());
            $(document).on('click', '#backBtn', () => this.handleBackButton());
        }

        handleAnswerSelection(e) {
            const isColorOption = $(e.target).closest('.color-option').length > 0;
            let selectedAnswer;
            
            if (isColorOption) {
                $('.color-circle').removeClass('selected');
                $(e.target).closest('.color-option').find('.color-circle').addClass('selected');
                selectedAnswer = $(e.target).closest('.color-option').data('answer');
            } else {
                $('.answer-option').removeClass('selected');
                $(e.target).addClass('selected');
                selectedAnswer = $(e.target).data('answer');
            }
            
            this.selectedAnswers[this.currentStep] = selectedAnswer;
            $('#nextBtn').prop('disabled', false);
        }

        handleNextButton() {
            if (this.currentStep < this.questions[0].steps.length - 1) {
                this.currentStep++;
                this.renderQuestion();
            } else {
                const filteredProducts = this.filterProducts();
                this.carousel.init(filteredProducts);
            }
        }

        handleBackButton() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.renderQuestion();
            }
        }

        filterProducts() {
            if (!Array.isArray(this.products)) {
                console.error('Products is not an array:', this.products);
                return [];
            }

            let filteredProducts = [...this.products];
            
            try {
                if (this.selectedAnswers[0]) {
                    filteredProducts = this.filterByCategory(filteredProducts);
                }
                if (this.selectedAnswers[1]) {
                    filteredProducts = this.filterByColor(filteredProducts);
                }
                if (this.selectedAnswers[2]) {
                    filteredProducts = this.filterByPrice(filteredProducts);
                }
                return filteredProducts;
            } catch (error) {
                console.error('Error in filterProducts:', error);
                return [];
            }
        }

        filterByCategory(products) {
            const category = this.selectedAnswers[0].toLowerCase();
            return products.filter(product => {
                if (!product) return false;
                const gender = product.gender?.toLowerCase() || '';
                const labels = (product.labels || []).map(label => label.toLowerCase());
                return gender.includes(category) || labels.includes(category);
            });
        }

        filterByColor(products) {
            const color = this.selectedAnswers[1].toLowerCase();
            return products.filter(product => {
                if (!product || !Array.isArray(product.colors)) return false;
                return product.colors.some(c => c.toLowerCase() === color);
            });
        }

        filterByPrice(products) {
            const priceRange = this.selectedAnswers[2];
            const [min, max] = priceRange.split('-').map(Number);
            return products.filter(product => {
                if (!product || typeof product.price !== 'number') return false;
                if (max) {
                    return product.price >= min && product.price <= max;
                }
                return product.price >= min;
            });
        }

        buildCSS() {
            const css = `
                #app {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                }

                .question-container {
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    padding-bottom: 100px;
                    position: relative;
                    min-height: calc(100vh - 80px);
                }

                .question-subtitle {
                    color: #666;
                    font-size: 16px;
                    margin-bottom: 20px;
                }

                .question-title {
                    font-size: 24px;
                    color: #333;
                    margin-bottom: 40px;
                    font-weight: bold;
                }

                .answers-container {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    max-width: 500px;
                    margin: 0 auto 40px;
                }

                .answer-option {
                    padding: 15px 20px;
                    border: 1px solid #ddd;
                    border-radius: 30px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: white;
                    font-size: 16px;
                    text-align: center;
                }

                .answer-option:hover {
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }

                .answer-option.selected {
                    background: #000;
                    color: white;
                    border-color: #000;
                    box-shadow: none;
                    transform: none;
                }

                  .navigation-buttons {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    gap: 40px;
                    padding: 20px;
                    z-index: 100;
                    width: 500px;
                    margin: 0 auto;
                }

                .nav-button-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                .nav-button {
                    width: 60px;
                    height: 40px;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    transition: all 0.3s ease;
                    color: #666;
                }

                .button-text {
                    font-size: 12px;
                    color: #999;
                    text-transform: uppercase;
                }

                .nav-button:hover {
                    background: #000;
                    color: white;   
                }

                .nav-button#backBtn {
                    background: white;
                    color: #000;
                    border-color: #ddd;
                }
                  .nav-button#backBtn:hover {
                    background: #000;
                    color: white;   
                }
                .product-carousel {
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto;
                    position: relative;
                    padding-bottom: 50px;
                }

                .carousel-container {
                    position: relative;
                    overflow: hidden;
                    touch-action: none;
                }

                .carousel-track {
                    display: flex;
                    transition: transform 0.3s ease;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    touch-action: pan-y pinch-zoom;
                }

                .carousel-item {
                    flex: 0 0 100%;
                    width: 100%;
                }

                .product-card {
                    text-align: center;
                    padding: 15px;
                }

                .product-card img {
                    max-width: 100%;
                    height: auto;
                    max-height: 300px;
                    object-fit: contain;
                    margin-bottom: 10px;
                }

                .product-card h3 {
                    font-size: 16px;
                    margin: 8px 0;
                    color: #333;
                    height: 40px;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .price-container {
                    margin: 10px 0;
                    text-align: center;
                }

                .original-price {
                    color: #999;
                    font-size: 14px;
                    display: block;
                }

                .current-price {
                    color: #ff0000;
                    font-size: 16px;
                    font-weight: bold;
                    display: block;
                }

                .carousel-arrow {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    border: none;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 2;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .prev-arrow {
                    left: -30px;
                }

                .next-arrow {
                    right: -30px;
                }

                .view-product {
                    display: inline-block;
                    background: #000;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 25px;
                    margin-top: 10px;
                    font-weight: 500;
                    font-size: 13px;
                    letter-spacing: 0.5px;
                    transition: all 0.3s ease;
                }

                .view-product:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }

                .no-products {
                    text-align: center;
                    padding: 50px;
                    font-size: 24px;
                    color: #666;
                }

                @media (max-width: 768px) {
                    .product-carousel {
                        max-width: 300px;
                    }

                    .carousel-arrow {
                        width: 25px;
                        height: 25px;
                        font-size: 14px;
                    }

                    .view-product {
                        display: none;
                    }
                }

                .error {
                    color: #721c24;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    padding: 20px;
                    margin: 20px;
                    border-radius: 4px;
                    text-align: center;
                }

                .color-answers {
                    display: flex !important;
                    flex-direction: row !important;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }

                .color-option {
                    cursor: pointer;
                    position: relative;
                    width: 60px;
                    height: 60px;
                }

                .color-circle {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid #ddd;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .color-option:hover .color-circle:not(.selected) {
                    transform: scale(1.1);
                }

                .color-circle.selected::after {
                    content: '';
                    position: absolute;
                    top: -9px;
                    left: -9px;
                    right: -9px;
                    bottom: -9px;
                    border: 2px solid #000;
                    border-radius: 50%;
                }

                .checkmark {
                    display: none;
                    color: #fff;
                    font-size: 24px;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-5deg);
                    font-family: system-ui, -apple-system, sans-serif;
                    font-weight: 400;
                }

                .color-circle.selected .checkmark {
                    display: block;
                }

              
                .color-circle[style*="background-color: #FFFFFF"].selected .checkmark,
                .color-circle[style*="background-color: #E8DCC4"].selected .checkmark {
                    color: #000;
                }

                .color-circle[style*="background-color: #FFFFFF"] {
                    border: 2px solid #ddd;
                    background: #FFFFFF;
                }

                .progress-indicators {
                    display: flex;
                    justify-content: center;
                    gap: 5px;
                    margin: 20px 0;
                    position: fixed;
                    bottom: 90px;
                    left: 0;
                    right: 0;
                    padding: 10px 0;
                }

                .indicator-line {
                    width: 30px;
                    height: 4px;
                    background: #ccc;
                    transition: background-color 0.3s ease;
                }

                .indicator-line.active {
                    background: #626262;
                }

                .carousel-indicators {
                    display: flex;
                    justify-content: center;
                    gap: 5px;
                    margin: 20px 0;
                    padding: 10px 0;
                }

                .carousel-line {
                    width: 30px;
                    height: 4px;
                    background: #E5E5E5;
                    transition: background-color 0.3s ease;
                }

                .carousel-line.active {
                    background: #626262;    
                }
            `;

            $('<style>').html(css).appendTo('head');
        }
    }

    $(document).ready(() => new QuizApp().init());
})(); 