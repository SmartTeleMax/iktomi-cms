/** @jsx React.DOM */

Widgets.Calendar = Widgets.create(Widgets.Widget, {
    componentDidMount: function(){
        if(this.props.readonly) { return; }
        var calendarConfig = defaultCalendarConfig();

        var el = this.getDOMNode();
        calendarConfig.container = el.getElement('.calendar-place');
        this.calendar = new Calendar(calendarConfig);
        this.calendar.addEvent('change', this.onCalendarChange);
        //window.calendar = this.calendar;
    },

    onCalendarChange: function(val){
        var dt = this.calendar.format(val);
        this.setValue(dt);
    },

    showCalendar: function(){
        if (this.calendar.isVisible()){
            this.calendar.hide();
        } else {
            var value = this.calendar.unformat(this.state.value+'') || null;
            value = (value && !isNaN(value.getTime()))? value: null;

            this.calendar.val = value;
            if (value){
                this.calendar.month = value.getMonth();
                this.calendar.year = value.getFullYear();
            }
            this.calendar.display();
        }
    },

    render: function() {
        var widget = this.props;
        var todayButton = widget.today_button?
              <span className='timecalendar-now' onClick={this.setToday}>сегодня</span>: '';
        var calendarButton = <button type="button"
                       key="calendar_button"
                       className={"calendar "+(widget.readonly?'hidden':'')}
                       onClick={this.showCalendar}></button>;
        calendarButton = widget.readonly ? '' : calendarButton;
        return <div>
               <input type="text"
                      name={widget.input_name}
                      value={this.state.value.text}
                      className={widget.classname||false}
                      size={widget.size||false}
                      disabled={widget.readonly||false}
                      //onBlur={this.onBlur}
                      onChange={this.onChange}
                      />
               {calendarButton} 
               {todayButton}
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



