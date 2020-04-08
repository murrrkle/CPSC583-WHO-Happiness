// Reference: https://bl.ocks.org/AntonOrlov/6b42d8676943cc933f48a43a7c7e5b6c

// Consts for the figure
const width = 960/1.5,
    height = 500/1.5,
    columns = 3,
    chartRadius = height / 2 - 40,
    imageScaleFactor = 3;

const color = d3.scaleOrdinal(d3.schemeCategory10);

// Consts for circle math
const PI = Math.PI,
    arcMinRadius = +30,
    arcPadding = 1,
    labelPadding = -5,
    numTicks = 10;


// Create the SVG
let svg = d3.select('body').append('svg')
    .attr('width', width * columns)
    .attr('height', height * Math.floor(157/columns));

let tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip');

// Create the clip path for the flags
svg.append("clipPath")
    .attr("id", "clipCircle")
    .append("circle")
    .attr("r", arcMinRadius);

// Import data
d3.csv('data.csv', function(d) {
    return {
        country : d.Country,
        happiness_score : +d["Happiness score"],
        dystopia_score : +d["Dystopia (1.88) + residual"],
        values : [+d["Explained by: GDP per capita"], +d["Explained by: Social support"],
            +d["Explained by: Healthy life expectancy"], +d["Explained by: Freedom to make life choices"], +d["Explained by: Generosity"],
            +d["Explained by: Perceptions of corruption"]]
    };
}).then(function(data) {
    // Then create new group for each country
    let plot = svg.selectAll('g')
        .data(data).enter()
        .append('g')
        .attr('transform', (d, i) => 'translate(' + (width / 2 + (i % columns) * width) + ',' + (height / 2 + (height * Math.floor(i/columns))) + ')');

    // Plot titles
    let titles = plot.append('text')
        .attr('font-size', 20)
        .attr('y', -5)
        .attr('x', chartRadius + 15)
        .attr('transform', 'rotate(' + 90 + ',' + (chartRadius + 10) + ',0)')
        .text(d => d.country);

    // Country flags
    let centers = plot.append('image')
        .attr('href', d => flags[d.country])
        .attr('width', arcMinRadius * imageScaleFactor)
        .attr('height', arcMinRadius * imageScaleFactor)
        .attr('x', -arcMinRadius * imageScaleFactor / 2)
        .attr('y', -arcMinRadius * imageScaleFactor / 2)
        .attr("clip-path", "url(#clipCircle)");

    centers.on('mousemove', showTooltipFlag);
    centers.on('mouseout', hideTooltip);

    // Define the scale
    let scale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(d.values)) * 1.1]) // Domain is 0 to happiness score (max value)
        .range([0, 2 * PI]); // Range is 0 to 2pi, or the full radians of a circle

    let ticks = scale.ticks(numTicks).slice(0, -1);

    // Number of arcs and their width
    const numArcs = data[0].values.length;
    const arcWidth = (chartRadius - arcMinRadius - numArcs * arcPadding) / numArcs;

    // Define an arc function to generate curves for all of the bars
    let arc = d3.arc()
        .innerRadius(function (d, i) {return getInnerRadius(i);})
        .outerRadius(function (d, i) {return getOuterRadius(i);})
        .startAngle(0)
        .endAngle(function (d, i) {return scale(d);});

    // Generate grid lines
    let radialAxis = plot.append('g')
        .attr('class', 'r axis');

    radialAxis.selectAll('circle').data(data[0].values).enter().append('circle')
        .attr('r', (d, i) => getInnerRadius(i) + arcPadding);

    radialAxis.selectAll('circle').data(data[0].values).enter().append('text')
        .attr('x', labelPadding)
        .attr('y', (d, i) => -getOuterRadius(i) + arcPadding)
        .text(d => d.key);

    let axialAxis = plot.append('g')
        .attr('class', 'a axis')
        .selectAll('g')
        .data(ticks)
        .enter()
        .append('g')
        .attr('transform', d => 'rotate(' + (rad2deg(scale(d)) - 90) + ')');

    axialAxis.append('line')
        .attr('x1', arcMinRadius)
        .attr('x2', chartRadius);

    axialAxis.append('text')
        .attr('x', chartRadius + 10)
        .style('text-anchor', d => (scale(d) >= PI && scale(d) < 2 * PI ? 'end' : null))
        .attr('transform', d => 'rotate(' + (90 - rad2deg(scale(d))) + ',' + (chartRadius + 10) + ',0)')
        .text(d => d);

    // Generate data arcs
    let arcs = plot.append('g')
        .attr('class', 'data')
        .selectAll('path')
        .data(d => d.values)
        .enter().append('path')
        .attr('class', 'arc')
        .style('fill', (d, i) => color(i));

    // Transition to make bars "grow" in, starting from the outside in
    arcs.transition()
         .delay((d, i) => i * 200)
         .duration(1000)
         .attrTween('d', arcTween);

    arcs.on('mousemove', showTooltip);
    arcs.on('mouseout', hideTooltip);


    function arcTween(d, i) {
        let interpolate = d3.interpolate(0, d);
        return t => arc(interpolate(t), i);
    }

    function showTooltipFlag(d, i) {
        tooltip.style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 25) + 'px')
            .style('display', 'inline-block')
            .html( "Total Happiness Score: " + d.happiness_score + "\nDystopia score: " + d.dystopia_score);
    }

    function showTooltip(d, i) {
        tooltip.style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 25) + 'px')
            .style('display', 'inline-block')
            .html(data.columns[i + 5] + ": " + d);
    }

    function hideTooltip() {
        tooltip.style('display', 'none');
    }

    function rad2deg(angle) {
        return angle * 180 / PI;
    }

    function getInnerRadius(index) {
        if (index > 7) console.log("Something's not right with an index in inner radius: " + index);
        return arcMinRadius + (numArcs - (index + 1)) * (arcWidth + arcPadding);
    }

    function getOuterRadius(index) {
        if (index > 7) console.log("Something's not right with an index in outer radius: " + index);
        return getInnerRadius(index) + arcWidth;
    }
});