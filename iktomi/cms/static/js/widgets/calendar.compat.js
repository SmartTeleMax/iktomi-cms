// Calendar: a Javascript class for Mootools that adds accessible and unobtrusive date pickers to your form elements <http://electricprism.com/aeron/calendar>
// Calendar RC4, Copyright (c) 2007 Aeron Glemann <http://electricprism.com/aeron>, MIT Style License.
// Mootools 1.2 compatibility by Davorin Šego

function $type(x){ return typeof x; }

var Calendar = new Class({

  Implements: Options,

    options: {
        blocked: [], // blocked dates
        classes: {}, // ['calendar', 'prev', 'next', 'month', 'year', 'today', 'invalid', 'valid', 'inactive', 'active', 'hilite']
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], // days of the week starting at sunday
        day_short:1,
        draggable: true,
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        navigation: 1, // 0 = no nav; 1 = single nav for month; 2 = dual nav for month and year
        offset: 0, // first day of the week: 0 = sunday, 1 = monday, etc..
        onHideStart: Class.empty,
        onHideComplete: Class.empty,
        onShowStart: Class.empty,
        onShowComplete: Class.empty,
        pad: 1, // padding between multiple calendars
        container: null,
        tweak: {x: 0, y: 0}, // tweak calendar positioning
        todayButton: true,
    },

    // initialize: calendar constructor
    // @param obj (obj) a js object containing the form elements and format strings { id: 'format', id: 'format' etc }
    // @param props (obj) optional properties

    initialize: function(options) {
        this.setOptions(options);

        // create our classes array
        var keys = ['calendar', 'prev', 'next', 'month', 'year', 'today', 'invalid', 'valid', 'inactive', 'active', 'hilite'];

        this.classes = {};
        keys.map(function(key, i) {
            this.classes[key] = this.options.classes[key] || key;
        }, this);

        // create cal element with css styles required for proper cal functioning
        this.calendar = new Element('div', {
            "class": this.classes.calendar + " hidden"
        }).inject(this.options.container || document.body);

        var id = 0;
        var d = new Date(); // today

        d.setDate(d.getDate()); // correct today for directional offset

        this.id = id++;
        this.month = d.getMonth();
        this.year = d.getFullYear();

        Object.merge(this, this.bounds()); // abs bounds of calendar
        Object.merge(this, this.values()); // valid days, months, years
    },


    // blocked: returns an array of blocked days for the month / year
    // @param cal (obj)
    // @returns blocked days (array)

    blocked: function() {
        var cal = this;
        var blocked = [];
        var offset = new Date(cal.year, cal.month, 1).getDay(); // day of the week (offset)
        var last = new Date(cal.year, cal.month + 1, 0).getDate(); // last day of this month

        this.options.blocked.each(function(date){
            var values = date.split(' ');

            // preparation
            for (var i = 0; i <= 3; i++){
                if (!values[i]){ values[i] = (i == 3) ? '' : '*'; } // make sure blocked date contains values for at least d, m and y
                values[i] = values[i].contains(',') ? values[i].split(',') : new Array(values[i]); // split multiple values
                var count = values[i].length - 1;
                for (var j = count; j >= 0; j--){
                    if (values[i][j].contains('-')){ // a range
                        var val = values[i][j].split('-');
                        for (var k = val[0]; k <= val[1]; k++){
                            if (!values[i].contains(k)){ values[i].push(k + ''); }
                        }
                        values[i].splice(j, 1);
                    }
                }
            }

            // execution
            if (values[2].contains(cal.year + '') || values[2].contains('*')){
                if (values[1].contains(cal.month + 1 + '') || values[1].contains('*')){
                    values[0].each(function(val){ // if blocked value indicates this month / year
                        if (val > 0){ blocked.push(val.toInt()); } // add date to blocked array
                    });

                    if (values[3]){ // optional value for day of week
                        for (var i = 0; i < last; i++){
                                var day = (i + offset) % 7;

                                if (values[3].contains(day + '')){
                                    blocked.push(i + 1); // add every date that corresponds to the blocked day of the week to the blocked array
                                }
                        }
                    }
                }
            }
        }, this);

        return blocked;
    },


    // bounds: returns the start / end bounds of the calendar
    // @param cal (obj)
    // @returns obj

    bounds: function() {
        // by default the calendar will accept a millennium +/-
        var start = new Date(1000, 0, 1); // jan 1, 1000
        var end = new Date(2999, 11, 31); // dec 31, 2999

        return { 'start': start, 'end': end };
    },


    // caption: returns the caption element with header and navigation
    // @param cal (obj)
    // @returns caption (element)

    caption: function() {
        var cal = this;
        // start by assuming navigation is allowed
        var navigation = {
            prev: { 'month': true, 'year': true },
            next: { 'month': true, 'year': true }
        };

        // if we're in an out of bounds year
        if (cal.year == cal.start.getFullYear()) {
            navigation.prev.year = false;
            if (cal.month == cal.start.getMonth() && this.options.navigation == 1) {
                navigation.prev.month = false;
            }
        }
        if (cal.year == cal.end.getFullYear()) {
            navigation.next.year = false;
            if (cal.month == cal.end.getMonth() && this.options.navigation == 1) {
                navigation.next.month = false;
            }
        }

        var caption = new Element('caption');

        var prev = new Element('a').addClass(this.classes.prev).appendText('\x3c'); // <
        var next = new Element('a').addClass(this.classes.next).appendText('\x3e'); // >

        if (this.options.navigation == 2) {
            var month = new Element('span').addClass(this.classes.month).inject(caption);

            if (navigation.prev.month) { prev.clone().addEvent('click', function(cal) { this.navigate('m', -1); }.pass(cal, this)).inject(month); }

            month.adopt(new Element('span').appendText(this.options.months[cal.month]));

            if (navigation.next.month) { next.clone().addEvent('click', function(cal) { this.navigate('m', 1); }.pass(cal, this)).inject(month); }

            var year = new Element('span').addClass(this.classes.year).inject(caption);

            if (navigation.prev.year) { prev.clone().addEvent('click', function(cal) { this.navigate('y', -1); }.pass(cal, this)).inject(year); }

            year.adopt(new Element('span').appendText(cal.year));

            if (navigation.next.year) { next.clone().addEvent('click', function(cal) { this.navigate('y', 1); }.pass(cal, this)).inject(year); }
        }
        else { // 1 or 0
            if (navigation.prev.month && this.options.navigation) {
                prev.clone().addEvent('click', this.navigate.bind(this, 'm', -1)).inject(caption);
            }

            caption.adopt(new Element('span').addClass(this.classes.month)
                                             .appendText(this.options.months[cal.month]));

            caption.adopt(new Element('span').addClass(this.classes.year)
                                             .appendText(cal.year));

            if (navigation.next.month && this.options.navigation) {
                next.clone().addEvent('click', this.navigate.bind(this, 'm', 1)).inject(caption);

            }
        }

        return caption;
    },


    // clicked: run when a valid day is clicked in the calendar
    // @param cal (obj)

    clicked: function(td, day) {
        var cal = this;
        cal.val = (this.value(cal) == day) ? null : new Date(cal.year, cal.month, day); // set new value - if same then disable

        if (cal.val) {
            this.toggle(cal); // hide cal
            this.fireEvent('change', cal.val);
        } else { // remove active class and replace with valid
            td.addClass(this.classes.valid);
            td.removeClass(this.classes.active);
        }

    },


    // display: create calendar element
    // @param cal (obj)

    display: function() {
        var cal = this;
        // 1. header and navigation
        this.calendar.empty(); // init div

        //this.calendar.className = this.classes.calendar + ' ' + this.options.months[cal.month].toLowerCase();

        var div = new Element('div').inject(this.calendar); // a wrapper div to help correct browser css problems with the caption element

        var table = new Element('table').inject(div).adopt(this.caption(cal));

        // 2. day names
        var thead = new Element('thead').inject(table);

        var tr = new Element('tr').inject(thead);

        for (var i = 0; i <= 6; i++) {
            var th = this.options.days[(i + this.options.offset) % 7];

            tr.adopt(new Element('th'/*, { 'title': th }*/).appendText(th.substr(0, this.options.day_short)));
        }

        // 3. day numbers
        var tbody = new Element('tbody').inject(table);
        var tr = new Element('tr').inject(tbody);

        var d = new Date(cal.year, cal.month, 1);
        var offset = ((d.getDay() - this.options.offset) + 7) % 7; // day of the week (offset)
        var last = new Date(cal.year, cal.month + 1, 0).getDate(); // last day of this month
        var prev = new Date(cal.year, cal.month, 0).getDate(); // last day of previous month
        var active = this.value(cal); // active date (if set and within curr month)
        var valid = cal.days; // valid days for curr month
        var inactive = []; // active dates
        var hilited = [];

        var d = new Date();
        var today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); // today obv

        for (var i = 1; i < 43; i++) { // 1 to 42 (6 x 7 or 6 weeks)
            if ((i - 1) % 7 == 0) { tr = new Element('tr').inject(tbody); } // each week is it's own table row

            var td = new Element('td').inject(tr);

            var day = i - offset;
            var date = new Date(cal.year, cal.month, day);

            var cls = '';

            if (day === active) { cls = this.classes.active; } // active
            else if (inactive.contains(day)) { cls = this.classes.inactive; } // inactive
            else if (valid.contains(day)) { cls = this.classes.valid; } // valid
            else if (day >= 1 && day <= last) { cls = this.classes.invalid; } // invalid

            if (date.getTime() == today) { cls = cls + ' ' + this.classes.today; } // adds class for today

            if (hilited.contains(day)) { cls = cls + ' ' + this.classes.hilite; } // adds class if hilited

            td.addClass(cls);

            if (valid.contains(day)) { // if it's a valid - clickable - day we add interaction
                //td.setProperty('title', this.format(date, 'D, jR M Y'));

                td.addEvent('click', this.clicked.bind(this, td, day));
            }

            // pad calendar with last days of prev month and first days of next month
            if (day < 1) { day = prev + day; }
            else if (day > last) { day = day - last; }

            td.appendText(day);
        }

        this.calendar.removeClass('hidden');
    },


    // format: formats a date object according to passed in instructions
    // @param date (obj)
    // @param f (string) any combination of punctuation / separators and d, j, D, l, S, m, n, F, M, y, Y
    // @returns string

    format: function(date, format) {
        var str = '';
        var format = format || this.options.format;

        if (date) {
            var j = date.getDate(); // 1 - 31
            var w = date.getDay(); // 0 - 6
            var l = this.options.days[w]; // Sunday - Saturday
            var n = date.getMonth() + 1; // 1 - 12
            var f = this.options.months[n - 1]; // January - December
            var y = date.getFullYear() + ''; // 19xx - 20xx

            for (var i = 0, len = format.length; i < len; i++) {
                var cha = format.charAt(i); // format char

                switch(cha) {
                    // year cases
                    case 'y': // xx - xx
                        y = y.substr(2);
                    case 'Y': // 19xx - 20xx
                        str += y;
                        break;

                    // month cases
                    case 'm': // 01 - 12
                        if (n < 10) { n = '0' + n; }
                    case 'n': // 1 - 12
                        str += n;
                        break;

                    case 'M': // Jan - Dec
                        f = f.substr(0, 3);
                    case 'F': // January - December
                        str += f;
                        break;

                    // day cases
                    case 'd': // 01 - 31
                        if (j < 10) { j = '0' + j; }
                    case 'j': // 1 - 31
                        str += j;
                        break;

                    case 'D': // Sun - Sat
                        l = l.substr(0, 3);
                    case 'l': // Sunday - Saturday
                        str += l;
                        break;

                    case 'N': // 1 - 7
                        w += 1;
                    case 'w': // 0 - 6
                        str += w;
                        break;

                    case 'S': // st, nd, rd or th (works well with j)
                        if (j % 10 == 1 && j != '11') { str += 'st'; }
                        else if (j % 10 == 2 && j != '12') { str += 'nd'; }
                        else if (j % 10 == 3 && j != '13') { str += 'rd'; }
                        else { str += 'th'; }
                        break;
                        case 'R':
                            if (j==3 ||j==23){ str += 'е'; }
                        else { str += 'ое'}
                        break;

                    default:
                        str += cha;
                }
            }
        }

      return str; //  return format with values replaced
    },


    // navigate: calendar navigation
    // @param cal (obj)
    // @param type (str) m or y for month or year
    // @param n (int) + or - for next or prev

    navigate: function(type, n) {
        var cal = this;
        switch (type) {
            case 'm': // month
                    if ($type(cal.months) == 'array') {
                        var i = cal.months.indexOf(cal.month) + n; // index of current month

                        if (i < 0 || i == 12) { // out of range
                            if (this.options.navigation == 1) { // if type 1 nav we'll need to increment the year
                                this.navigate('y', n);
                            }

                            i = (i < 0) ? 12 - 1 : 0;
                        }

                        cal.month = cal.months[i];
                    }
                    else {
                        var i = cal.month + n;

                        if (i < 0 || i == 12) {
                            cal.year += (i < 0) ? -1: 1;
                            i = (i < 0) ? 11 : 0;
                        }

                        cal.month = i;
                    }
                    break;

                case 'y': // year
                    if ($type(cal.years) == 'array') {
                        var i = cal.years.indexOf(cal.year) + n;

                        cal.year = cal.years[i];
                    }
                    else {
                        cal.year += n;
                    }
                    break;
        }

        Object.merge(cal, this.values());

        if ($type(cal.months) == 'array') { // if the calendar has a months select
            var i = cal.months.indexOf(cal.month); // and make sure the curr months exists for the new year

            if (i < 0) { cal.month = cal.months[0]; } // otherwise we'll reset the month
        }


        this.display();
    },


    // sort: helper function for numerical sorting

    sort: function(a, b) {
        return a - b;
    },


    // toggle: show / hide calendar
    // @param cal (obj)

    toggle: function() {
        if (this.calendar.hasClass('hidden')){
            this.display();
        } else {
            this.hide();
        }
    },

    isVisible: function(){
        return !this.calendar.hasClass('hidden');
    },

    hide: function() {
        this.calendar.addClass('hidden');
    },

    // unformat: takes a value from an input and parses the d, m and y elements
    // @param val (string)
    // @param f (string) any combination of punctuation / separators and d, j, D, l, S, m, n, F, M, y, Y
    // @returns array

    unformat: function(val, f) {
        f = f || this.options.format;
        f = f.escapeRegExp();

        var re = {
            d: '([0-9]{2})',
            j: '([0-9]{1,2})',
            D: '(' + this.options.days.map(function(day) { return day.substr(0, 3); }).join('|') + ')',
            l: '(' + this.options.days.join('|') + ')',
            S: '(st|nd|rd|th)',
            F: '(' + this.options.months.join('|') + ')',
            m: '([0-9]{2})',
            M: '(' + this.options.months.map(function(month) { return month.substr(0, 3); }).join('|') + ')',
            n: '([0-9]{1,2})',
            Y: '([0-9]{4})',
            y: '([0-9]{2})',
            R: '(е|ое)'
        }

        var arr = []; // array of indexes

        var g = '';

        // convert our format string to regexp
        for (var i = 0; i < f.length; i++) {
            var c = f.charAt(i);

            if (re[c]) {
                arr.push(c);

                g += re[c];
            }
            else {
                g += c;
            }
        }

        // match against date
        var matches = val.match('^' + g + '$');

        var dates = new Array(3);

        if (matches) {
            matches = matches.slice(1); // remove first match which is the date

            arr.each(function(c, i) {
                i = matches[i];

                switch(c) {
                    // year cases
                    case 'y':
                        i = '19' + i; // 2 digit year assumes 19th century (same as JS)
                    case 'Y':
                        dates[0] = i.toInt();
                        break;

                    // month cases
                    case 'F':
                        i = i.substr(0, 3);
                    case 'M':
                        i = this.options.months.map(function(month) { return month.substr(0, 3); }).indexOf(i) + 1;
                    case 'm':
                    case 'n':
                        dates[1] = i.toInt() - 1;
                        break;

                    // day cases
                    case 'd':
                    case 'j':
                        dates[2] = i.toInt();
                        break;
                }
            }, this);
        }
        console.log(dates[0], dates[1] , dates[2]);
        return new Date(dates[0], dates[1] , dates[2]);
    },


    // value: returns day value of calendar if set
    // @param cal (obj)
    // @returns day (int) or null

    value: function() {
        var day = null;

        if (this.val) {
            if (this.year == this.val.getFullYear() &&
                    this.month == this.val.getMonth()) {
                day = this.val.getDate();
            }
        }

        return day;
    },


    // values: returns the years, months (for curr year) and days (for curr month and year) for the calendar
    // @param cal (obj)
    // @returns obj

    values: function(cal) {
        var cal = this;
        var years, months, days;

        // we start with what would be the first and last days were there no restrictions
        var first = 1;
        var last = new Date(cal.year, cal.month + 1, 0).getDate(); // last day of the month

        // if we're in an out of bounds year
        if (cal.year == cal.start.getFullYear()) {
            // in the special case of improved navigation but no months array, we'll need to construct one
            if (months == null && this.options.navigation == 2) {
                months = [];

                for (var i = 0; i < 12; i ++) {
                    if (i >= cal.start.getMonth()) { months.push(i); }
                }
            }

            // if we're in an out of bounds month
            if (cal.month == cal.start.getMonth()) {
                first = cal.start.getDate(); // first day equals day of bound
            }
        }
        if (cal.year == cal.end.getFullYear()) {
            // in the special case of improved navigation but no months array, we'll need to construct one
            if (months == null && this.options.navigation == 2) {
                months = [];

                for (var i = 0; i < 12; i ++) {
                    if (i <= cal.end.getMonth()) { months.push(i); }
                }
            }

            if (cal.month == cal.end.getMonth()) {
                last = cal.end.getDate(); // last day equals day of bound
            }
        }

        // let's get our invalid days
        var blocked = this.blocked(cal);

        // finally we can prepare all the valid days in a neat little array
        if (typeof days == 'array') { // somewhere there was a days select
            days = days.filter(function(day) {
                if (day >= first && day <= last && !blocked.contains(day)) { return day; }
            });
        }
        else { // no days select we'll need to construct a valid days array
            days = [];

            for (var i = first; i <= last; i++) {
                if (!blocked.contains(i)) { days.push(i); }
            }
        }

        days.sort(this.sort); // sorting our days will give us first and last of month

        return { 'days': days, 'months': months, 'years': years };
    },

    todayFormat: function(){
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();
        var val = new Date(year, month, day);
        return this.format(val);
    },

});

Calendar.implement(new Events, new Options);

document.addEvent('domready', function(){
    document.addEvent('click', function(e){
        if (!e.target.hasClass('calendar') && 
                !e.target.getParent('.calendar')){
            $$('div.calendar').addClass('hidden');
        }
    }, true);
    document.addEvent('keyup', function(e){
        if (e.keyCode === 27) {
            $$('div.calendar').addClass('hidden');
        }
    });
})

