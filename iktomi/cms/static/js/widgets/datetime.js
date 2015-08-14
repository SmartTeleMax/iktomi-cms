/** @jsx React.DOM */

Widgets.Datetime = Widgets.create(Widgets.Widget, {
    componentDidMount: function(){
        if(this.props.readonly) { return; }
        var el = this.getDOMNode().getElement('.calendar-place');

        var calendarConfig = defaultCalendarConfig();
        calendarConfig.container = el;
        this.calendar = new Calendar(calendarConfig);
        this.calendar.addEvent('change', this.onCalendarChange);

        var clockConfig = {container: el,
                           onChange: this.onClockChange}
        this.clock = new ClockPicker(clockConfig);
        //window.calendar = this.calendar;
    },

    onClockChange: function(val){
        this.setValue({time: this.clock.value});
    },

    onCalendarChange: function(val){
        var dt = this.calendar.format(val);
        this.setValue({date: dt});
    },

    setNow: function(){
        var val = new Date();
        var dt = this.calendar.format(val);
        var tm = val.getHours() + ':' + val.getMinutes();
        this.setValue({date: dt, time: tm});
    },

    onChange: function(){
        var el = this.getDOMNode();
        this.setValue({date: el.getElement('input.calendar').value,
                       time: el.getElement('input.timeinput').value });
    },

    showCalendar: function(){
        if (this.calendar.isVisible()){
            this.calendar.hide();
        } else {
            var value = this.calendar.unformat(this.state.value.date+'') || null;
            value = (value && !isNaN(value.getTime()))? value: null;

            this.calendar.val = value;
            if (value){
                this.calendar.month = value.getMonth();
                this.calendar.year = value.getFullYear();
            }
            this.calendar.display();
        }
    },

    showClock: function(){
        if (this.clock.isShown()){
            this.clock.hide();
        } else {
            this.clock.value = this.state.value.time+'';
            this.clock.show();
        }
    },

    render: function() {
        var widget = this.props;
        var nowButton = widget.now_button && ! widget.readonly?
              <span className='timecalendar-now'
                    onClick={this.setNow}>
                  {widget.now_button_text}
              </span>: '';
        var calendarButton = !widget.readonly?
              <button type="button"
                      className="calendar"
                      onClick={this.showCalendar}></button>: '';
        var timeButton = !widget.readonly?
              <button type="button"
                       className="timecalendar-toggle"
                       onClick={this.showClock}></button>: '';

        var changes = this.props.changedFields;
        var calendarClass = 'calendar';
        if(changes.date && changes.date["."] && changes.date['.'].text){
            calendarClass = calendarClass+' changed-after-publication';
        };
        var timeClass = 'timeinput';
        if(changes.time && changes.time["."] && changes.time['.'].text){
            timeClass = timeClass+' changed-after-publication';
        };

        return <div>
               <input type="text"
                      name={widget.input_name+".date"}
                      value={this.state.value.date+""}
                      className={calendarClass}
                      size={widget.size||false}a
                      readOnly={widget.readonly||false}
                      //onBlur={this.onBlur}
                      onChange={this.onChange}
                      />
               {calendarButton}
               <input type="text"
                      name={widget.input_name+".time"}
                      value={this.state.value.time+""}
                      className={timeClass}
                      readOnly={widget.readonly||false}
                      onFocus={this.showClock}
                      //onBlur={this.onBlur}
                      onChange={this.onChange}
                      />
               {timeButton}
               {nowButton}
               <div className="calendar-place"></div>
            </div>;
    }
});

function defaultCalendarConfig(){
    return {
      'draggable': false,
      'months': [
          'Январь',
          'Февраль',
          'Март',
          'Апрель',
          'Май',
          'Июнь',
          'Июль',
          'Август',
          'Сентябрь',
          'Октябрь',
          'Ноябрь',
          'Декабрь'
      ],
      'format': 'd.m.Y',
      'days': ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
              'day_short':2,
      'offset': 1,
      'container': $('app-content')
    }
}



