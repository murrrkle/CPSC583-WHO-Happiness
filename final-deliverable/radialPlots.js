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

function arcInTransition(d, i) {
    let interpolate = d3.interpolate(0, d);
    return t => arc(interpolate(t), i);
}

function arcOutTransition(d, i) {
    let interpolate = d3.interpolate(d, 0);
    return t => arc(interpolate(t), i);
}

function showRadialToolTip(d, i) {
    tooltip.style('display', 'inline-block')
        .html(columns[i] + ": " + d)
        .style('left', (d3.event.pageX + 10) + 'px')
        .style('top', (d3.event.pageY ) + 'px')
        .style("opacity", 1);
}

function hideTooltip() {
    tooltip.style("opacity", 0);
}

function generateRadial(object, values) {
    if (!d3.select(object).classed("ActiveSituated")) {
        // Toggle state
        d3.select(object).classed("ActiveSituated", !d3.select(object).classed("ActiveSituated"));

        // Get center around which to generate plot
        let bbox = object.getBBox();
        let centroid = [bbox.x + bbox.width/2, bbox.y + bbox.height/2];


        // Generate radial plot
        let t = d3.select(object).data()[0];
        let container = d3.select("#" + t.properties.ISO3_CODE);
        if (container.empty())
            container = situatedOverlay.append('g')
                .attr("transform", function (t) {
                    return "translate(" + centroid[0] + ", " + centroid[1] + ")";
                })
                .attr("id", t.properties.ISO3_CODE);


        let ticks = radialScale.ticks(numTicks).slice(0, -1);
        let vals = values[2].find(d => (d.country === t.properties.NAME_ENGL)).values;

        // Generate grid lines
        let radialAxis = container.append('g')
            .attr('class', 'r axis');

        radialAxis.selectAll('circle')
            .data(vals).enter()
            .append('circle')
            .attr('r', (d, i) => getInnerRadius(i))
            .attr('stroke', "black")
            .attr('stroke-width', "0.1")
            .attr('fill', "none");

        let axialAxis = container.append('g')
            .attr('class', 'a axis')
            .selectAll('g')
            .data(ticks)
            .enter()
            .append('g')
            .attr('transform', d => 'rotate(' + (rad2deg(radialScale(d)) - 90) + ')');

        axialAxis.append('line')
            .attr('x1', arcMinRadius)
            .attr('x2', chartRadius - arcWidth - arcPadding)
            .attr('stroke', "black")
            .attr('stroke-width', "0.1")
            .attr('fill', "none");

        // axialAxis.append('text')
        //     .attr('x', chartRadius + 1.5)
        //     .style('text-anchor', d => (radialScale(d) >= PI && radialScale(d) < 2 * PI ? 'end' : null))
        //     .style('font-size', '3px')
        //     .attr('transform', d => 'rotate(' + (90 - rad2deg(radialScale(d))) + ',' + (chartRadius + 1.5) + ',0)')
        //     .text(d => d);

        // Create arcs if they aren't there already
        let arcs = container.selectAll('.arc');
        if (arcs.empty()) {
            // Generate arcs
            arcs = container.selectAll('path')
                .data(vals)
                .enter().append('path')
                .attr('class', 'arc')
                .attr('opacity', '0.9')
                .style('fill', (d, i) => barColor(i));
        }

        // Create clip path if it's not there already
        // Have to do this weird thing where you reference the current path,
        // but you have to do it through a clip path
        if (clip.select("#clip-" + t.properties.ISO3_CODE).empty())
            clip.append("clipPath")
                .attr("id", "clip-" + t.properties.ISO3_CODE)
                .append("use")
                .attr("xlink:href", "#path-" + t.properties.ISO3_CODE);

        // Hacky way of doing this so I don't have to figure out variable passing within event tags
        let flagToolTip = function() {
            let vals = values[2].find(d => d.country === t.properties.NAME_ENGL);
            tooltip.style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 25) + 'px')
                .style('display', 'inline-block')
                .html( t.properties.NAME_ENGL + "<br\>Happiness Score: " + vals.happiness_score + "<br\>Dystopia score: " + vals.dystopia_score)
                .style("opacity", 1);
        }

        d3.select(object).append('image')
            .on('mousemove', flagToolTip)
            .on('mouseout', hideTooltip)
            .attr('href', d => flags[t.properties.NAME_ENGL])
            .attr('width', arcMinRadius * imageScaleFactor)
            .attr('height', arcMinRadius * imageScaleFactor)
            .attr('x', centroid[0] - arcMinRadius * imageScaleFactor / 2)
            .attr('y', centroid[1] - arcMinRadius * imageScaleFactor / 2)
            .attr("clip-path", "url(#clip-" + t.properties.ISO3_CODE + ")")
            .style("opacity", 0)
            .transition().duration(1000)
            .style("opacity", 1);

        // Scale down the size of the center
        let scale = 0.4;
        d3.select(object).transition()
            .duration(1000)
            .attr("transform", "translate(" + ((1 - scale) * centroid[0]) + ", " + ((1 - scale) * centroid[1]) + ") scale(" + scale + ")");

        // Transition to make bars "grow" in, starting from the outside in
        arcs.transition()
            .delay((d, i) => i * 200)
            .duration(500)
            .attrTween('d', arcInTransition);

        // Tooltips
        arcs.on('mousemove', showRadialToolTip);
        arcs.on('mouseout', hideTooltip);
    } else {
        d3.select(object).classed("ActiveSituated", !d3.select(object).classed("ActiveSituated"));
        d3.select(object).transition()
            .duration(1000)
            .attr("transform", "");

        let t = d3.select(object).data()[0];
        let arcs = d3.select("#" + t.properties.ISO3_CODE).selectAll('.arc');

        // Transition to make bars "shrink" out and then remove the DOM elements
        if (!arcs.empty())
            arcs.transition()
                .delay((d, i) => i * 200)
                .duration(500)
                .attrTween('d', arcOutTransition);
        d3.select(object).select('image').transition().duration(1000).style("opacity", 0).remove();
        d3.select("#" + t.properties.ISO3_CODE).selectAll('g')
            .transition().delay(1000)
            .remove();
    }
}