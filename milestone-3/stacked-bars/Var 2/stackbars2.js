// adapted from Tutorial 6 slides by TA Nathan Douglas
// tooltips from https://bl.ocks.org/d3noob/a22c42db65eb00d4e369
let width = 100,
    height = 300,
    columns = 5,
    margins = {top: 20, right: 20, bottom: 30, left: 50},
    heightSpacingCoefficient = 1.5,
    widthSpacingCoefficient = 2;

d3.csv('explainedby.csv', function(d) {
    return {
        country :                d.Country,
        happiness :             +d["Happiness score"],
        dystopia :              +d["Dystopia (1.88) + residual"],
        gdp :                   +d["Explained by: GDP per capita"],
        socialSupport :         +d["Explained by: Social support"],
        lifeExpectancy :        +d["Explained by: Healthy life expectancy"],
        choiceFreedom :         +d["Explained by: Freedom to make life choices"],
        generosity :            +d["Explained by: Generosity"],
        corruptionPerception :  +d["Explained by: Perceptions of corruption"]
    };
}).then(function(data) {
    // set up measures to stack
    let keys = ["dystopia",
        "gdp",
        "socialSupport",
        "lifeExpectancy",
        "choiceFreedom",
        "generosity",
        "corruptionPerception"];
    let stack = d3.stack()
        .keys(keys);
    let series = stack(data);

    // set up scales
    let domain = data.map(d => (d.country));
    let xScale = d3.scaleBand(domain, [0, data.length * width])
        .padding(0.2);

    let sums = data.map(function (d) {
        let sum = d.dystopia + d.gdp + d.socialSupport + d.lifeExpectancy + d.choiceFreedom + d.generosity + d.corruptionPerception;
        return sum;
    });
    //let maxSum = Math.max(sums);  // not working for some reason
    let maxSum = sums[0]; // they're already sorted from max to lowest

    let yScale = d3.scaleLinear([0, 100], [height, 0])
        .nice();

    // set up SVG
    let chart = d3.select("body").append("svg")
        .attr("width", (margins.left + margins.right + width) * (columns + 1))
        .attr("height", (margins.top + margins.bottom + heightSpacingCoefficient *height) * Math.ceil(data.length/columns));

    //setup tooltip
    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // setup colours
    let classes = ["Dystopia (1.88) + Residual",
        "Explained by: GDP per capita",
        "Explained by: Social support",
        "Explained by: Healthy life expectancy",
        "Explained by: Freedom to make life choices",
        "Explained by: Generosity",
        "Explained by: Perceptions of corruption"];

    let colours = d3.scaleOrdinal().domain(classes)
        .range(d3.schemePastel2);

    // make groups
    let explainers = chart.selectAll(".explainer")
        .data(series);

    let countries = chart.selectAll(".country")
        .data(data);

    let explainerBars = explainers.enter().append("g")
        .attr("class", "explainer")
        .attr("id", (d, i) => (classes[i]))
        .attr("transform", translate(margins.left, margins.top))
        .attr("fill", (d, i) => colours(i))
        .merge(explainers)
        .selectAll(".bar").data(d => (d));

    let index = -1;

    explainerBars = explainerBars.enter()
        .append("g")
        .attr("class", (d, i) => {index += 1; return ( "barGroup " + d.data.country.replace(/ /g,'') + ' ' + keys[Math.floor(index / 156)]);})
    index = -1;

    // add a border to show proportion
    d3.selectAll(".barGroup.dystopia")
        .append("rect")
        .attr("class", "border")
        .attr("stroke-width", "1")
        .attr("stroke", "grey")
        .attr("fill", "white")
        .attr("fill-opacity", "0")
        .attr("x", (d,i) => (widthSpacingCoefficient * width * (i % columns) - 0.5)) // longitude
        .attr("y", (d, i) => (heightSpacingCoefficient * height * Math.floor(i / columns))) // latitude;
        .attr("width", xScale.bandwidth() + 1)
        .attr("height", height);

    explainerBars.append("rect")
        .attr("class", (d, i) => { index += 1; return ("bar " + d.data.country.replace(/ /g,'') + ' ' + keys[Math.floor(index / 156)]);})
        .merge(explainerBars)
        .attr("x", (d,i) => (widthSpacingCoefficient * width * (i % columns))) // longitude
        .attr("y", (d, i) => (heightSpacingCoefficient * height * Math.floor(i / columns) + yScale(d[1]/d.data.happiness*100))) // latitude
        .attr("width", xScale.bandwidth())
        .attr("height", d => (yScale(d[0]/d.data.happiness*100) - yScale(d[1]/d.data.happiness*100)))

        // interactivity prototyping
        .on("mouseover", function(d) {
            d3.select(this)
                .transition()
                .attr("stroke", "grey")
                .attr("stroke-width", 1);
            //console.log(d3.select(this).attr("class").split(" "));
            barExplainer = d3.select(this).attr("class").split(" ")[2];
            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.html(classes[keys.indexOf(barExplainer)] +" = " + d.data[barExplainer])
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            d3.select(this)
                .transition()
                .attr("stroke", "grey")
                .attr("stroke-width", 0);
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // add the country name underneath the lowest bar group
    d3.selectAll(".barGroup.dystopia")
        .append("text")
        .text(d => d.data.country)
        .attr("font-size", "1em")
        .attr("fill", d3.color("grey").darker())
        .attr("text-anchor", "middle")
        .attr("x", (d,i) => (margins.left - 10 + widthSpacingCoefficient * width * (i % columns))) // longitude
        .attr("y", (d, i) => (heightSpacingCoefficient * height * Math.floor(i / columns) + height + 20)) // latitude;

    // show the percentage of contribution for each explainer
    keys.forEach(k => {
        d3.selectAll(".barGroup." + k)
            .append("text")
            .text(d => Math.round(d.data[k]/d.data.happiness*100) + "%")
            .attr("font-size", d => d.data[k]/d.data.happiness*5 + "rem")
            .attr("font-weight", "bold")
            .attr("fill", d3.color(colours(keys.indexOf(k))).darker())
            .attr("text-anchor", "middle")
            .attr("x", (d,i) => (margins.left - 10 + widthSpacingCoefficient * width * (i % columns))) // longitude
            .attr("y", (d, i) => (heightSpacingCoefficient * height * Math.floor(i / columns) +
                                yScale(d[0]/d.data.happiness*100) - (yScale(d[0]/d.data.happiness*100) - yScale(d[1]/d.data.happiness*100))/2));
    });

});

function translate(x, y) {
    return `translate (${x}, ${y})`;
}