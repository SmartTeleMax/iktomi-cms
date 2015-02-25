/*!
 * ClockPicker v{package.version} (http://weareoutman.github.io/clockpicker/)
 * Copyright 2014 Wang Shenwei.
 * Licensed under MIT (https://github.com/weareoutman/clockpicker/blob/gh-pages/LICENSE)
 */

;(function(){
    // Can I use inline svg ?
    var svgNS = 'http://www.w3.org/2000/svg',
        svgSupported = 'SVGAngle' in window && (function(){
            var supported,
                el = document.createElement('div');
            el.innerHTML = '<svg/>';
            supported = (el.firstChild && el.firstChild.namespaceURI) == svgNS;
            el.innerHTML = '';
            return supported;
        })();

    // Can I use transition ?
    // Listen touch events in touch screen device, instead of mouse events in desktop.
    var touchSupported = 'ontouchstart' in window;
    touchSupported = false; // not implemented

    var mousedownEvent = 'mousedown' + ( touchSupported ? ' touchstart' : ''),
        mousemoveEvent = 'mousemove' + ( touchSupported ? ' touchmove' : ''),
        mouseupEvent = 'mouseup' + ( touchSupported ? ' touchend' : '');

    function createSvgElement(name) {
        return document.createElementNS(svgNS, name);
    }

    function leadingZero(num) {
        return (num < 10 ? '0' : '') + num;
    }

    // Get a unique id
    var idCounter = 0;
    function uniqueId(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    }

    // Clock size
    var dialRadius = 100,
        outerRadius = 80,
        // innerRadius = 80 on 12 hour clock
        innerRadius = 54,
        tickRadius = 13,
        diameter = dialRadius * 2,
        duration = 350;

    // Popover template
    var tpl = [
        '<div class="popover clockpicker-popover hidden">',
            '<div class="arrow"></div>',
            //'<div class="popover-title">',
            //    '<span class="clockpicker-span-hours text-primary"></span>',
            //    ' : ',
            //    '<span class="clockpicker-span-minutes"></span>',
            //'</div>',
            '<div class="popover-content">',
                '<div class="clockpicker-plate">',
                    '<div class="clockpicker-canvas"></div>',
                    '<div class="clockpicker-dial clockpicker-hours"></div>',
                    '<div class="clockpicker-dial clockpicker-minutes clockpicker-dial-out"></div>',
                '</div>',
            '</div>',
        '</div>'
    ].join('');

    // ClockPicker
    function ClockPicker(options) {
        var popover = Elements.from(tpl)[0];
        var plate = popover.querySelector('.clockpicker-plate');
        var hoursView = popover.querySelector('.clockpicker-hours');
        var minutesView = popover.querySelector('.clockpicker-minutes');
        var timer;
        options = Object.merge({}, ClockPicker.DEFAULTS, options);

        popover.inject(options.container);
        this.value = options.value || options.default;
        this.id = uniqueId('cp');
        this.options = options;
        this.currentView = 'hours';
        this.popover = popover;
        this.plate = plate;
        this.hoursView = hoursView;
        this.minutesView = minutesView;
        //this.spanHours = popover.getElements('.clockpicker-span-hours');
        //this.spanMinutes = popover.getElements('.clockpicker-span-minutes');

        popover.addClass(options.placement);
        popover.addClass('clockpicker-align-' + options.align);

        //this.spanHours.addEvent('click', this.toggleView.bind(this, 'hours'));
        //this.spanMinutes.addEvent('click', this.toggleView.bind(this, 'minutes'));

        // Build ticks
        var tickTpl = Elements.from('<div class="clockpicker-tick"></div>')[0],
            i, tick, radian, radius;

        for (i = 0; i < 24; i += 1) {
            tick = tickTpl.clone();
            radian = i / 6 * Math.PI;
            var inner = i > 0 && i < 13;
            radius = inner ? innerRadius : outerRadius;
            tick.setStyles({
                left: dialRadius + Math.sin(radian) * radius - tickRadius,
                top: dialRadius - Math.cos(radian) * radius - tickRadius
            });
            if (inner) {
                tick.setStyle('font-size', '120%');
            }
            tick.set('text', i === 0 ? '00' : i);
            hoursView.appendChild(tick);
            tick.addEvent(mousedownEvent, this.mousedown.bind(this));
        }

        // Minutes view
        for (i = 0; i < 60; i += 5) {
            tick = tickTpl.clone();
            radian = i / 30 * Math.PI;
            tick.setStyles({
                left: dialRadius + Math.sin(radian) * outerRadius - tickRadius,
                top: dialRadius - Math.cos(radian) * outerRadius - tickRadius
            });
            tick.setStyle('font-size', '120%');
            tick.set('text', leadingZero(i));
            minutesView.appendChild(tick);
            tick.addEvent(mousedownEvent, this.mousedown.bind(this));
        }

        // Clicking on minutes view space
        plate.addEvent(mousedownEvent, function(e){
            if (e.target.getParent('.clockpicker-tick') == null) {
                this.mousedown(e, true);
            }
        }.bind(this));

        this.initSvg();

        raiseCallback(this.options.init);
    }

    // Mousedown or touchstart
    ClockPicker.prototype.mousedown = function(e, space) {
        var offset = this.plate.getCoordinates(),
            isTouch = /^touch/.test(e.type),
            x0 = offset.left + dialRadius,
            y0 = offset.top + dialRadius,
            // XXX touch events?
            dx = (isTouch ? e.originalEvent.touches[0] : e).page.x - x0,
            dy = (isTouch ? e.originalEvent.touches[0] : e).page.y - y0,
            z = Math.sqrt(dx * dx + dy * dy),
            moved = false;

        // When clicking on minutes view space, check the mouse position
        if (space && (z < outerRadius - tickRadius || z > outerRadius + tickRadius)) {
            return;
        }
        e.preventDefault();

        // Set cursor style of body after 200ms
        var movingTimer = setTimeout(function(){
            document.body.addClass('clockpicker-moving');
        }, 200);

        // Place the canvas to top
        if (svgSupported) {
            this.plate.appendChild(this.canvas);
        }

        // Clock
        this.setHand(dx, dy, ! space, true);

        // Mousemove on document
        this.popover.removeEvents(mousemoveEvent).addEvent(mousemoveEvent, function(e){
            e.preventDefault();
            var isTouch = /^touch/.test(e.type),
                x = (isTouch ? e.originalEvent.touches[0] : e).page.x - x0,
                y = (isTouch ? e.originalEvent.touches[0] : e).page.y - y0;
            if (! moved && x === dx && y === dy) {
                // Clicking in chrome on windows will trigger a mousemove event
                return;
            }
            moved = true;
            this.setHand(x, y, false, true);
        }.bind(this));

        // Mouseup on document
        this.popover.removeEvents(mouseupEvent);
        this.popover.addEvent(mouseupEvent, function(e){
            this.popover.removeEvents(mouseupEvent);
            e.preventDefault();

            var isTouch = /^touch/.test(e.type),
                x = (isTouch ? e.originalEvent.changedTouches[0] : e).pageX - x0,
                y = (isTouch ? e.originalEvent.changedTouches[0] : e).pageY - y0;
            if ((space || moved) && x === dx && y === dy) {
                this.setHand(x, y);
            }
            if (this.currentView === 'hours') {
                this.toggleView('minutes', duration / 2);
            } else {
                this.minutesView.addClass('clockpicker-dial-out');
                setTimeout(function(){
                    this.done();
                }.bind(this), duration / 2);
            }
            //plate.prepend(canvas);

            // Reset cursor style of body
            clearTimeout(movingTimer);
            document.body.removeClass('clockpicker-moving');
        }.bind(this));
    }

    function raiseCallback(callbackFunction) {
        if (callbackFunction && typeof callbackFunction === "function") {
            callbackFunction();
        }
    }

    // Default options
    ClockPicker.DEFAULTS = {
        'default': '',       // default time, 'now' or '13:14' e.g.
        fromnow: 0,          // set default time to * milliseconds from now (using with default = 'now')
        placement: 'bottom', // clock popover placement
        align: 'left',       // popover arrow align
        container: document.body
    };


    ClockPicker.prototype.initSvg = function(){
        if (svgSupported) {
            // Draw clock hands and others
            var canvas = this.popover.querySelector('.clockpicker-canvas'),
                svg = createSvgElement('svg');
            svg.setAttribute('class', 'clockpicker-svg');
            svg.setAttribute('width', diameter);
            svg.setAttribute('height', diameter);
            var g = createSvgElement('g');
            g.setAttribute('transform', 'translate(' + dialRadius + ',' + dialRadius + ')');
            var bearing = createSvgElement('circle');
            bearing.setAttribute('class', 'clockpicker-canvas-bearing');
            bearing.setAttribute('cx', 0);
            bearing.setAttribute('cy', 0);
            bearing.setAttribute('r', 2);
            var hand = createSvgElement('line');
            hand.setAttribute('x1', 0);
            hand.setAttribute('y1', 0);
            var bg = createSvgElement('circle');
            bg.setAttribute('class', 'clockpicker-canvas-bg');
            bg.setAttribute('r', tickRadius);
            var fg = createSvgElement('circle');
            fg.setAttribute('class', 'clockpicker-canvas-fg');
            fg.setAttribute('r', 3.5);
            g.appendChild(hand);
            g.appendChild(bg);
            g.appendChild(fg);
            g.appendChild(bearing);
            svg.appendChild(g);
            canvas.appendChild(svg);

            this.hand = hand;
            this.bg = bg;
            this.fg = fg;
            this.bearing = bearing;
            this.g = g;
            this.canvas = canvas;
        }
    }

    // Show or hide popover
    ClockPicker.prototype.isShown = function(){
        return !this.popover.hasClass('hidden');
    }

    // Show or hide popover
    ClockPicker.prototype.toggle = function(){
        this[this.isShown ? 'hide' : 'show']();
    };

    // Show popover
    ClockPicker.prototype.show = function(e){
        // Not show again
        if (this.isShown()) {
            return;
        }

        raiseCallback(this.options.beforeShow);

        // Get the time
        var value = this.value.split(':');

        this.hours = + value[0] || 0;
        this.minutes = + value[1] || 0;
        //this.spanHours.set('html', leadingZero(this.hours));
        //this.spanMinutes.set('html', leadingZero(this.minutes));

        // Toggle to hours view
        this.toggleView('hours');
        this.popover.removeClass('hidden');

        raiseCallback(this.options.afterShow);
    };

    // Hide popover
    ClockPicker.prototype.hide = function(){
        this.popover.addClass('hidden');
    };

    // Toggle to hours or minutes view
    ClockPicker.prototype.toggleView = function(view, delay){
        this.popover.removeEvents(mousemoveEvent);
        this.popover.removeEvents(mouseupEvent);

        var isHours = view === 'hours',
            nextView = isHours ? this.hoursView : this.minutesView,
            hideView = isHours ? this.minutesView : this.hoursView;

        this.currentView = view;

        //this.spanHours.toggleClass('text-primary', isHours);
        //this.spanMinutes.toggleClass('text-primary', ! isHours);

        // Let's make transitions
        hideView.addClass('clockpicker-dial-out');
        nextView.setStyle('visibility', 'visible').removeClass('clockpicker-dial-out');

        // Reset clock hand
        this.resetClock(delay);

        // After transitions ended
        clearTimeout(this.toggleViewTimer);
        this.toggleViewTimer = setTimeout(function(){
            hideView.setStyle('visibility', 'hidden');
        }, duration);

    };

    // Reset clock hand
    ClockPicker.prototype.resetClock = function(delay){
        var view = this.currentView,
            value = this[view],
            isHours = view === 'hours',
            unit = Math.PI / (isHours ? 6 : 30),
            radian = value * unit,
            radius = isHours && value > 0 && value < 13 ? innerRadius : outerRadius,
            x = Math.sin(radian) * radius,
            y = - Math.cos(radian) * radius;
        if (svgSupported && delay) {
            this.canvas.addClass('clockpicker-canvas-out');
            setTimeout(function(){
                this.canvas.removeClass('clockpicker-canvas-out');
                this.setHand(x, y);
            }.bind(this), delay);
        } else {
            this.setHand(x, y);
        }
    };

    // Set clock hand to (x, y)
    ClockPicker.prototype.setHand = function(x, y, roundBy5, dragging){
        var radian = Math.atan2(x, - y),
            isHours = this.currentView === 'hours',
            unit = Math.PI / (isHours || roundBy5 ? 6 : 30),
            z = Math.sqrt(x * x + y * y),
            options = this.options,
            inner = isHours && z < (outerRadius + innerRadius) / 2,
            radius = inner ? innerRadius : outerRadius,
            value;

        // Radian should in range [0, 2PI]
        if (radian < 0) {
            radian = Math.PI * 2 + radian;
        }

        // Get the round value
        value = Math.round(radian / unit);

        // Get the round radian
        radian = value * unit;

        if (isHours) {
            if (value === 12) {
                value = 0;
            }
            value = inner ? (value === 0 ? 12 : value) : value === 0 ? 0 : value + 12;
        } else {
            if (roundBy5) {
                value *= 5;
            }
            if (value === 60) {
                value = 0;
            }
        }

        this[this.currentView] = value;
        this.done(false);
        //this[isHours ? 'spanHours' : 'spanMinutes'].set('text', leadingZero(value));

        // If svg is not supported, just add an active class to the tick
        if (! svgSupported) {
            this[isHours ? 'hoursView' : 'minutesView'].querySelector('.clockpicker-tick').each(function(tick){
                tick.toggleClass('active', value === + tick.get('text'));
            });
            return;
        }

        // Place clock hand at the top when dragging
        if (dragging || (! isHours && value % 5)) {
            this.g.insertBefore(this.hand, this.bearing);
            this.g.insertBefore(this.bg, this.fg);
            this.bg.setAttribute('class', 'clockpicker-canvas-bg clockpicker-canvas-bg-trans');
        } else {
            // Or place it at the bottom
            this.g.insertBefore(this.hand, this.bg);
            this.g.insertBefore(this.fg, this.bg);
            this.bg.setAttribute('class', 'clockpicker-canvas-bg');
        }

        // Set clock hand and others' position
        var cx = Math.sin(radian) * radius,
            cy = - Math.cos(radian) * radius;
        if (isNaN(cy)){ debugger; }
        this.hand.setAttribute('x2', cx);
        this.hand.setAttribute('y2', cy);
        this.bg.setAttribute('cx', cx);
        this.bg.setAttribute('cy', cy);
        this.fg.setAttribute('cx', cx);
        this.fg.setAttribute('cy', cy);
    };

    // Hours and minutes are selected
    ClockPicker.prototype.done = function(hide) {
        hide = hide === undefined? true: hide;
        if (hide) { this.hide(); }

        var last = this.value;
        this.value = leadingZero(this.hours) + ':' + leadingZero(this.minutes);
        if (this.value !== last) {
            raiseCallback(this.options.onChange);
        }

    };

    // Remove clockpicker
    ClockPicker.prototype.remove = function() {
        this.popover.destroy();
    };

    window.ClockPicker = ClockPicker;

}());

document.addEvent('domready', function(){
    document.addEvent('click', function(e){
        if (!e.target.hasClass('clockpicker-popover') && 
                !e.target.hasClass('timeinput') && 
                !e.target.getParent('.clockpicker-popover')){
            $$('.clockpicker-popover').addClass('hidden');
            document.body.removeClass('clockpicker-moving');
        }
    }, true);
    document.addEvent('keyup', function(e){
        if (e.keyCode === 27) {
            $$('.clockpicker-popover').addClass('hidden');
            document.body.removeClass('clockpicker-moving');
        }
    });
})
