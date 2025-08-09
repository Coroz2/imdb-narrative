class CinemaVisualization {
    constructor() {
        this.currentScene = 1;
        this.selectedDecade = 2000;
        this.selectedGenre = 'all';
        this.minRating = 8.0;
        this.data = [];
        this.filteredData = [];
        
        this.margin = { top: 40, right: 80, bottom: 80, left: 80 };
        this.width = 900 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
        this.xScale = null;
        this.yScale = null;
        this.colorScale = null;
        this.sizeScale = null;
        
        this.svg = null;
        this.chartGroup = null;
        this.tooltip = null;
        
        this.init();
    }
    
    async init() {
        this.setupSVG();
        this.setupTooltip();
        this.setupEventListeners();
        await this.loadData();
        this.setupScales();
        this.renderScene1();
    }
    
    setupSVG() {
        this.svg = d3.select('#main-chart')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
            
        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    }
    
    setupTooltip() {
        this.tooltip = d3.select('#tooltip');
    }
    
    setupEventListeners() {
        // Scene navigation triggers
        d3.select('#scene1-btn').on('click', () => this.switchToScene(1));
        d3.select('#scene2-btn').on('click', () => this.switchToScene(2));
        d3.select('#scene3-btn').on('click', () => this.switchToScene(3));
        
        d3.select('#decade-slider').on('input', (event) => {
            this.selectedDecade = +event.target.value;
            d3.select('#decade-display').text(this.selectedDecade + 's');
            if (this.currentScene === 1) this.updateScene1();
        });
        
        d3.select('#genre-select').on('change', (event) => {
            this.selectedGenre = event.target.value;
            if (this.currentScene === 2) this.updateScene2();
        });

        d3.select('#rating-filter').on('input', (event) => {
            this.minRating = +event.target.value;
            d3.select('#rating-display').text(this.minRating);
            if (this.currentScene === 3) this.updateScene3();
        });
        
    }
    
    async loadData() {
        try {
            const rawData = await d3.csv('data/imdb_top_1000.csv');
            
            this.data = rawData.map(d => ({
                title: d.Series_Title,
                year: +d.Released_Year,
                rating: +d.IMDB_Rating,
                metaScore: d.Meta_score ? +d.Meta_score : null,
                genre: d.Genre.split(',')[0].trim(),
                director: d.Director,
                votes: +d.No_of_Votes.replace(/,/g, ''),
                gross: d.Gross && d.Gross.trim() !== '' ? +d.Gross.replace(/[",$]/g, '') : null,
                runtime: +d.Runtime.replace(' min', ''),
                overview: d.Overview,
                stars: [d.Star1, d.Star2, d.Star3, d.Star4].filter(s => s)
            })).filter(d => d.year >= 1920 && d.year <= 2020);
            
            console.log(`Loaded ${this.data.length} movies`);
            
            const moviesWithGross = this.data.filter(d => d.gross);
            console.log(`Movies with gross data: ${moviesWithGross.length}`);
            console.log('Sample gross values:', moviesWithGross.slice(0, 5).map(d => ({title: d.title, gross: d.gross})));
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    setupScales() {
        // Year
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.year))
            .range([0, this.width]);
            
        // Rating
        this.yScale = d3.scaleLinear()
            .domain([6.5, 9.5])
            .range([this.height, 0]);
            
        // Genre
        const genres = [...new Set(this.data.map(d => d.genre))];
        this.colorScale = d3.scaleOrdinal()
            .domain(genres)
            .range(d3.schemeCategory10);
            
        // Number of votes (popularity)
        this.sizeScale = d3.scaleSqrt()
            .domain(d3.extent(this.data, d => d.votes))
            .range([3, 12]);
    }
    
    switchToScene(sceneNumber) {
        // Update navigation
        d3.selectAll('.nav-btn').classed('active', false);
        d3.select(`#scene${sceneNumber}-btn`).classed('active', true);
        
        // Update controls
        d3.selectAll('.scene-controls').classed('active', false);
        d3.select(`#scene${sceneNumber}-controls`).classed('active', true);
        
        this.currentScene = sceneNumber;
        
        this.chartGroup.selectAll('*').remove();
        
        switch(sceneNumber) {
            case 1:
                this.renderScene1();
                break;
            case 2:
                this.renderScene2();
                break;
            case 3:
                this.renderScene3();
                break;
        }
    }
    
    renderScene1() {
        // Scene 1: Timeline of Excellence
        this.updateSceneTitle(
            'Timeline of Excellence',
            'Explore how movie ratings and popularity have evolved over the decades'
        );
        
        this.drawAxes('Year', 'IMDB Rating');
        this.drawGridLines();
        
        this.filteredData = this.data;
        
        this.drawMovieDots();
        this.addScene1Annotations();
        this.updateScene1Insight();
    }
    
    renderScene2() {
        // Scene 2: Genre Evolution
        this.updateSceneTitle(
            'Genre Evolution',
            'Discover how different movie genres have dominated different eras'
        );
        
        this.drawAxes('Year', 'IMDB Rating');
        this.drawGridLines();
        
        this.filteredData = this.data;
        this.drawMovieDots();
        this.addScene2Annotations();
        this.updateScene2Insight();
    }
    
    renderScene3() {
        this.updateSceneTitle(
            'Critics vs Box Office',
            'Examine the relationship between critical acclaim and commercial success'
        );
    
        const minBoxOffice = 50000000;
    
        this.filteredData = this.data.filter(d => {
            const hasValidGross = d.gross && !isNaN(d.gross) && d.gross >= minBoxOffice;
            const hasValidMeta = d.metaScore && !isNaN(d.metaScore);
            const hasValidRating = d.rating >= this.minRating;
            return hasValidGross && hasValidMeta && hasValidRating;
        });
    
        console.log(`Scene 3: Filtered to ${this.filteredData.length} movies`);
        
        this.grossExtentScene3 = d3.extent(
            this.data.filter(d => d.gross && !isNaN(d.gross) && d.gross >= minBoxOffice),
            d => d.gross
        );
    
        const xScaleGross = d3.scaleLinear()
            .domain([minBoxOffice, this.grossExtentScene3[1]])
            .range([0, this.width]);
    
        const yScaleMeta = d3.scaleLinear()
            .domain([20, 100])
            .range([this.height, 0]);
    
        this.drawCustomAxes('Box Office Gross (Major Releases $50M+)', 'Metacritic Score', xScaleGross, yScaleMeta);
        this.drawGridLines();
        this.drawScene3Dots(xScaleGross, yScaleMeta);
        this.addScene3Annotations(xScaleGross, yScaleMeta);
        this.updateScene3Insight();
    }
    
    updateSceneTitle(title, description) {
        d3.select('#scene-heading').text(title);
        d3.select('#scene-description').text(description);
    }
    
    drawAxes(xLabel, yLabel) {
        this.chartGroup.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${this.height})`)
            .call(d3.axisBottom(this.xScale).tickFormat(d3.format('d')));
            
        this.chartGroup.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(this.yScale));
            
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height + 50)
            .style('text-anchor', 'middle')
            .text(xLabel);
            
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -50)
            .style('text-anchor', 'middle')
            .text(yLabel);
    }
    
    drawCustomAxes(xLabel, yLabel, xScale, yScale) {
        // X axis
        this.chartGroup.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${this.height})`)
            .call(d3.axisBottom(xScale)
                .ticks(8)
                .tickFormat(d => {
                    const millions = d / 1000000;
                    if (millions >= 1000) {
                        return `$${(millions/1000).toFixed(1)}B`;
                    } else if (millions >= 100) {
                        return `$${millions.toFixed(0)}M`;
                    } else {
                        return `$${millions.toFixed(0)}M`;
                    }
                }));
            
        // Y axis
        this.chartGroup.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale));
            
        // Axis labels
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height + 50)
            .style('text-anchor', 'middle')
            .text(xLabel);
            
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -50)
            .style('text-anchor', 'middle')
            .text(yLabel);
    }
    
    drawGridLines() {
        // Horizontal lines
        this.chartGroup.selectAll('.grid-line-horizontal')
            .data(this.yScale.ticks())
            .enter()
            .append('line')
            .attr('class', 'grid-line grid-line-horizontal')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d));
            
        // Vertical lines
        this.chartGroup.selectAll('.grid-line-vertical')
            .data(this.xScale.ticks())
            .enter()
            .append('line')
            .attr('class', 'grid-line grid-line-vertical')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', 0)
            .attr('y2', this.height);
    }
    
    drawMovieDots() {
        const dots = this.chartGroup.selectAll('.movie-dot')
            .data(this.filteredData)
            .enter()
            .append('circle')
            .attr('class', 'movie-dot')
            .attr('cx', d => this.xScale(d.year))
            .attr('cy', d => this.yScale(d.rating))
            .attr('r', d => this.sizeScale(d.votes))
            .attr('fill', d => this.colorScale(d.genre))
            .attr('opacity', 0.7);
            
        this.addTooltipEvents(dots);
    }
    
    drawScene3Dots(xScale, yScale) {
        const dots = this.chartGroup.selectAll('.movie-dot')
            .data(this.filteredData)
            .enter()
            .append('circle')
            .attr('class', 'movie-dot')
            .attr('cx', d => xScale(d.gross))
            .attr('cy', d => yScale(d.metaScore))
            .attr('r', d => this.sizeScale(d.votes))
            .attr('fill', d => this.colorScale(d.genre))
            .attr('opacity', 0.7);
            
        this.addTooltipEvents(dots);
    }
    
    addTooltipEvents(selection) {
        const self = this;
        
        selection
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1).classed('highlighted', true);
                
                const tooltipContent = `
                    <strong>${d.title}</strong> (${d.year})<br/>
                    <strong>Rating:</strong> ${d.rating}/10<br/>
                    <strong>Genre:</strong> ${d.genre}<br/>
                    <strong>Director:</strong> ${d.director}<br/>
                    <strong>Votes:</strong> ${d3.format(',')(d.votes)}<br/>
                    ${d.gross ? `<strong>Gross:</strong> $${d3.format(',')(d.gross)}<br/>` : ''}
                    ${d.metaScore ? `<strong>Metacritic:</strong> ${d.metaScore}/100<br/>` : ''}
                    <em>${d.overview.substring(0, 100)}...</em>
                `;
                
                self.tooltip
                    .html(tooltipContent)
                    .classed('visible', true)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 0.7).classed('highlighted', false);
                self.tooltip.classed('visible', false);
            });
    }
    
    addScene1Annotations() {
        // Find notable movies for annotations
        const shawshank = this.data.find(d => d.title === 'The Shawshank Redemption');
        const godfather = this.data.find(d => d.title === 'The Godfather');
        
        if (shawshank) {
            const annotations = [{
                note: {
                    label: 'The Shawshank Redemption',
                    title: 'Highest Rated Movie',
                    wrap: 150
                },
                x: this.xScale(shawshank.year),
                y: this.yScale(shawshank.rating),
                dx: 50,
                dy: -30
            }];
            
            const makeAnnotations = d3.annotation()
                .annotations(annotations);
                
            this.chartGroup.append('g')
                .attr('class', 'annotation-group')
                .call(makeAnnotations);
        }
    }
    
    addScene2Annotations() {
        // Highlight genre trends
        const dramaMovies = this.data.filter(d => d.genre === 'Drama');
        const actionMovies = this.data.filter(d => d.genre === 'Action');
        
        const annotations = [];
        
        if (dramaMovies.length > 0) {
            const avgYear = d3.mean(dramaMovies, d => d.year);
            const avgRating = d3.mean(dramaMovies, d => d.rating);
            
            annotations.push({
                note: {
                    label: 'Drama dominates the top ratings',
                    title: 'Genre Insight',
                    wrap: 120
                },
                x: this.xScale(avgYear),
                y: this.yScale(avgRating),
                dx: -80,
                dy: -40
            });
        }
        
        if (annotations.length > 0) {
            const makeAnnotations = d3.annotation()
                .annotations(annotations);
                
            this.chartGroup.append('g')
                .attr('class', 'annotation-group')
                .call(makeAnnotations);
        }
    }
    
    addScene3Annotations(xScale, yScale) {
        // Find movies with high gross and high meta score
        const successfulMovies = this.filteredData
            .filter(d => d.gross > 300000000 && d.metaScore > 80)
            .sort((a, b) => b.gross - a.gross)
            .slice(0, 1);
            
        if (successfulMovies.length > 0) {
            const movie = successfulMovies[0];
            const annotations = [{
                note: {
                    label: `${movie.title} - Critical and commercial success`,
                    title: 'Sweet Spot',
                    wrap: 150
                },
                x: xScale(movie.gross),
                y: yScale(movie.metaScore),
                dx: -100,
                dy: -50
            }];
            
            const makeAnnotations = d3.annotation()
                .annotations(annotations);
                
            this.chartGroup.append('g')
                .attr('class', 'annotation-group')
                .call(makeAnnotations);
        }
    }
    
    updateScene1() {
        // Highlight movies from selected decade
        const decadeStart = this.selectedDecade;
        const decadeEnd = this.selectedDecade + 9;
        
        this.chartGroup.selectAll('.movie-dot')
            .attr('opacity', d => {
                return (d.year >= decadeStart && d.year <= decadeEnd) ? 1 : 0.3;
            })
            .attr('stroke-width', d => {
                return (d.year >= decadeStart && d.year <= decadeEnd) ? 3 : 1.5;
            });
            
        this.updateScene1Insight();
    }
    
    updateScene2() {
        // Highlight selected genre
        this.chartGroup.selectAll('.movie-dot')
            .attr('opacity', d => {
                return (this.selectedGenre === 'all' || d.genre === this.selectedGenre) ? 0.8 : 0.2;
            })
            .attr('stroke-width', d => {
                return (this.selectedGenre === 'all' || d.genre === this.selectedGenre) ? 2 : 1;
            });
            
        this.updateScene2Insight();
    }
    
    updateScene3() {
        const minBoxOffice = 50000000;
    
        this.filteredData = this.data.filter(d => {
            const hasValidGross = d.gross && !isNaN(d.gross) && d.gross >= minBoxOffice;
            const hasValidMeta = d.metaScore && !isNaN(d.metaScore);
            const hasValidRating = d.rating >= this.minRating;
            return hasValidGross && hasValidMeta && hasValidRating;
        });
    
        console.log(`Scene 3 Update: Filtered to ${this.filteredData.length} movies with rating >= ${this.minRating}`);
    
        if (this.filteredData.length === 0) {
            console.warn('No data available for Scene 3 update');
            return;
        }
    
        const grossExtent = this.grossExtentScene3;
    
        this.chartGroup.selectAll('*').remove();
    
        const xScaleGross = d3.scaleLinear()
            .domain([minBoxOffice, grossExtent[1]])
            .range([0, this.width]);
    
        const yScaleMeta = d3.scaleLinear()
            .domain([20, 100])
            .range([this.height, 0]);
    
        this.drawCustomAxes('Box Office Gross (Major Releases $50M+)', 'Metacritic Score', xScaleGross, yScaleMeta);
        this.drawGridLines();
        this.drawScene3Dots(xScaleGross, yScaleMeta);
        this.addScene3Annotations(xScaleGross, yScaleMeta);
        this.updateScene3Insight();
    }
    
    updateScene1Insight() {
        const decadeMovies = this.data.filter(d => 
            d.year >= this.selectedDecade && d.year <= this.selectedDecade + 9
        );
        
        const avgRating = d3.mean(decadeMovies, d => d.rating).toFixed(1);
        const count = decadeMovies.length;
        
        d3.select('#insight-title').text(`${this.selectedDecade}s Cinema`);
        d3.select('#insight-text').text(
            `The ${this.selectedDecade}s produced ${count} top-rated films with an average IMDB rating of ${avgRating}. ` +
            `This decade ${count > 80 ? 'was particularly prolific' : count > 50 ? 'had solid representation' : 'had fewer but quality films'} in cinema history.`
        );
    }
    
    updateScene2Insight() {
        if (this.selectedGenre === 'all') {
            const genreCounts = d3.rollup(this.data, v => v.length, d => d.genre);
            const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];
            
            d3.select('#insight-title').text('Genre Distribution');
            d3.select('#insight-text').text(
                `Among the top 1000 films, ${topGenre[0]} leads with ${topGenre[1]} movies, ` +
                `demonstrating its consistent ability to produce critically acclaimed cinema.`
            );
        } else {
            const genreMovies = this.data.filter(d => d.genre === this.selectedGenre);
            const avgRating = d3.mean(genreMovies, d => d.rating).toFixed(1);
            const yearRange = d3.extent(genreMovies, d => d.year);
            
            d3.select('#insight-title').text(`${this.selectedGenre} Movies`);
            d3.select('#insight-text').text(
                `${this.selectedGenre} films span from ${yearRange[0]} to ${yearRange[1]} with an average rating of ${avgRating}. ` +
                `This genre has ${genreMovies.length} representatives in the top 1000.`
            );
        }
    }
    
    updateScene3Insight() {
        const highGrossMovies = this.filteredData.filter(d => d.gross > 200000000);
        const correlation = this.calculateCorrelation(
            this.filteredData.map(d => d.gross),
            this.filteredData.map(d => d.metaScore)
        );
        
        d3.select('#insight-title').text('Critics vs Commercial Success');
        d3.select('#insight-text').text(
            `Among movies rated ${this.minRating}+, there are ${highGrossMovies.length} blockbusters (>$200M). ` +
            `The correlation between box office and critical acclaim is ${correlation > 0 ? 'positive' : 'negative'} (r=${correlation.toFixed(2)}), ` +
            `${Math.abs(correlation) > 0.3 ? 'suggesting a meaningful relationship' : 'indicating weak correlation'}.`
        );
    }
    
    calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = d3.sum(x);
        const sumY = d3.sum(y);
        const sumXY = d3.sum(x.map((xi, i) => xi * y[i]));
        const sumX2 = d3.sum(x.map(xi => xi * xi));
        const sumY2 = d3.sum(y.map(yi => yi * yi));
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CinemaVisualization();
});