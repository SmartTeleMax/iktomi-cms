(function () {
    "use strict";

    var Time = function (el, options) {

        var timeField = el.getElement('input.timeinput');
        var dateField = el.getElement('input.calendar');

        function formatTime(hours, minutes) {
            return ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2);
        }

        function generateTimes(delta) {
            var mm, hh, time, times = [], minutes = 0;
            for (; minutes < 60 * 24; minutes += delta) {
                time = formatTime(Math.floor(minutes / 60), minutes % 60);
                times.push(time);
            }
            return times;
        }

        function createToggleButton(options) {
            var button = new Element('button', {'type': 'button', 'class': 'timecalendar-toggle'});
            options.classname && button.addClass(options.classname);
            options.click && button.addEvent('click', options.click);
            return button;
        }

        function createNowButton(options) {
            var button = new Element('span', {'class': 'timecalendar-now'});
            button.set('text', 'сейчас');
            button.addEvent('click', function (e) {
                // set time
                var date = new Date();
                var hh = date.getHours();
                var mm = date.getMinutes();
                this.timeField.value = formatTime(hh, mm);
                // set date
                var cal = this.dateField.calendar;
                var control = this.dateField.calendarControl;
                var year = date.getFullYear();
                var month = date.getMonth();
                var day = date.getDate();
                cal.year = year;
                cal.month = month;
                cal.day = day;
                cal.val = new Date(year, month, day);
                control.write(cal);
                control.display(cal);
            });
            return button;
        }

        function createWidget(options) {
            var i, j, tr, td, time,
                container = new Element('div', {'class': options.classname, styles: options.styles}),
                table = new Element('table'),
                times = generateTimes(options.delta);

            for (i = 0; i < options.columns; i++) {
                tr = new Element('tr');
                for (j = 0; j < options.rows; j++) {
                    td = new Element('td');
                    td.addEvent('click', options.click);
                    time = times[j * options.columns + i];
                    time && td.set('text', time);
                    td.inject(tr);
                }
                tr.inject(table);
            }

            table.inject(container);

            return container;
        }
        

        var nowButton = createNowButton().inject(timeField, 'after');
        nowButton.timeField = timeField;
        nowButton.dateField = dateField;
        var toggleButton = createToggleButton({click: toggle}).inject(timeField, 'after');
        var widget = createWidget({
            columns: 8,
            rows: 6,
            delta: 30,
            classname: 'timecalendar',
            styles: {
                top: toggleButton.getCoordinates().top,
                left: toggleButton.getCoordinates().left + 20,
                visibility: 'hidden'
            },
            click: function(e) {
                timeField.value = e.target.innerText || e.target.textContent;
                widget.setStyle('visibility', 'hidden');
                document.body.removeEvent('mousedown', close);
            }
        }).inject(options.container);

        function close(e) {
            var target = e.target;

            while (target != document.body && target.nodeType == 1) {
                if (target == widget) {
                    return;
                }
                target = target.parentNode;
            }

            widget.setStyle('visibility', 'hidden');
            document.body.removeEvent('mousedown', close);
        }

        function toggle(e) {
            e.stopPropagation();
            e.preventDefault();
            widget.setStyle('visibility', 'visible');
            document.body.addEvent('mousedown', close);
        }

    };

    Blocks.register('datetime', function (el) {
        return !el.dataset.readonly && Time(el, {container: $('app-content')});
    });
})();

