// References: https://bl.ocks.org/AntonOrlov/6b42d8676943cc933f48a43a7c7e5b6c,
//             https://www.d3-graph-gallery.com/graph/circular_barplot_label.html


// Consts for the figure
const width = 960/1.5,
    height = 500/1.5,
    columns = 3,
    chartRadius = height / 2 - 40,
    imageScaleFactor = 3;

const color = d3.scaleOrdinal(d3.schemeCategory10);
const arcMinRadius = +50;

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
    plot.append('text')
        .attr('font-size', 20)
        .attr('y', 0)
        .attr('x', chartRadius)
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

    plot.append('circle')
        .attr('r', arcMinRadius)
        .attr('stroke', 'black')
        .attr('stroke-width', '2')
        .attr('fill', 'none');

    centers.on('mousemove', showTooltipFlag);
    centers.on('mouseout', hideTooltip);

    // Scales
    var x = d3.scaleLinear()
        .range([0, 2 * Math.PI])
        .domain([0, data[0].values.length]);
    var y = d3.scaleLinear()
        .range([arcMinRadius, chartRadius])
        .domain([0, d3.max(data, d => d3.max(d.values))]);

    // Add the bars
    let arc = d3.arc()
        .innerRadius(arcMinRadius)
        .outerRadius(function(d) { return y(d); })
        .startAngle(function(d, i) { return x(i); })
        .endAngle(function(d, i) { return x(i) + 1; })
        .padAngle(0.01)
        .padRadius(arcMinRadius);

    let bars = plot.append("g")
        .selectAll("path")
        .data(d => d.values)
        .enter()
        .append("path")
        .attr("fill", (d, i) => color(i));

    bars.transition()
        .delay((d, i) => i * 200)
        .duration(1000)
        .attrTween('d', arcTween);

    bars.on('mousemove', showTooltip);
    bars.on('mouseout', hideTooltip);

    // Add the labels
    // plot.append("g")
    //     .selectAll("g")
    //     .data(d => d.values)
    //     .enter()
    //     .append("g")
    //     .attr("text-anchor", function(d, i) { return (x(i) + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start"; })
    //     .attr("transform", function(d, i) { return "rotate(" + (x(i) * 180 / Math.PI - 90) + ")" + "translate(" + (y(d) + 10) + ",0)"; })
    //     .append("text")
    //     .text(function(d, i) { return(data.columns[i + 5]) })
    //     .attr("transform", function(d, i) { return (x(i) + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)"; })
    //     .style("font-size", "11px")
    //     .attr("alignment-baseline", "middle");


    function arcTween(d, i) {
        let interpolate = d3.interpolate(0, d);
        return t => arc(interpolate(t), i);
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

    function showTooltipFlag(d, i) {
        tooltip.style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 25) + 'px')
            .style('display', 'inline-block')
            .html( "Total Happiness Score: " + d.happiness_score + "\nDystopia score: " + d.dystopia_score);
    }
});