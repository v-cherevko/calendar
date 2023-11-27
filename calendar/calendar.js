import { LightningElement, api, track, wire } from 'lwc'
import { CurrentPageReference } from 'lightning/navigation'
import { registerListener, unregisterAllListeners, fireEvent } from 'c/pubsub'

const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

const SHORT_DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

export default class Calendar extends LightningElement {

    @api month = null
    @api year = null
    @api selectedItemId = null

    @track firstRender = true
    @track dates = []
    @track closeModal = false

    @wire(CurrentPageReference) pageRef

    connectedCallback() {
      registerListener('createcalendareventheader', this.handleCreateEventHeader, this)
      registerListener('closecalendarmodal', this.handleCloseCalendarModal, this)
      registerListener('selectsearcheventitem', this.handleSelectSearchEventItem, this)
    }

    disconnectedCallback() {
      unregisterAllListeners(this)
    }

    renderedCallback() {
        if (this.firstRender) {
            this.firstRender = false
            this.getDate()
            this.getDatesOfMonth()
            this.getCalendarEvents()
        }
    }

    get selectedDate() {
        return `${MONTHS[this.month]} ${this.year}`
    }

    getDate() {
      this.month = new Date().getMonth()
      this.year = new Date().getFullYear()
    }

    getDatesOfMonth() {
        const currYear = new Date().getFullYear()
        const currMonth = new Date().getMonth()
        const currDay = new Date().getDate()
        const firstDayOfMonth = new Date(this.year, this.month, 7).getDay()
        const lastDateOfMonth =  new Date(this.year, this.month + 1, 0).getDate()
        const lastDayOfLastMonth = this.month == 0 ? new Date(this.year - 1, 11, 0).getDate() : new Date(this.year, this.month, 0).getDate()
        const result = []
        let day = 1

        do {
            let dow = new Date(this.year, this.month, day).getDay()

            // Последние дни предыдущего месяца
            if(day === 1) {
              let k = lastDayOfLastMonth - firstDayOfMonth + 1
              for(let j = 0; j < firstDayOfMonth; j++) {
                result.push({
                  id: new Date(this.year, this.month - 1, k).toISOString(),
                  key: new Date(this.year, this.month - 1, k),
                  day: k + "",
                  class: 'calendar-container__item',
                  selected: false 
                })
                k++
              }
            }

            // Текущий день в цикл
            result.push({
              id: new Date(this.year, this.month, day).toISOString(),
              key: new Date(this.year, this.month, day),
              day: day + "",
              class: 'calendar-container__item' + (currYear == this.year && currMonth == this.month && day == currDay ? ' calendar-container__item_current' : ''),
              selected: false
            })

            // Первые дни следующего месяца
            if (dow !== 0 && day === lastDateOfMonth) {
              let k = 1
              for(dow; dow < 7; dow++) {
                result.push({
                  id: new Date(this.year, this.month + 1, k).toISOString(),
                  key: new Date(this.year, this.month + 1, k),
                  day: k + "",
                  class: 'calendar-container__item',
                  selected: false
                })
                k++
              }
            }

            day++
        } while (day <= lastDateOfMonth)

        for(let i = 0; i < DAYS_OF_WEEK.length; i++) {
          if(window.innerWidth < 768) {
            result[i].dayOfWeek = `${SHORT_DAYS_OF_WEEK[i]}`
          } else {
            result[i].dayOfWeek = `${DAYS_OF_WEEK[i]}`
          }
        }

        this.dates = [...result]
    }

    getCalendarEvents() {
      const putItem = (e) => {
        this.dates = this.dates.map((o) => {
          if (o.id === e.id) {
            return {
              ...e,
              dayOfWeek: o.dayOfWeek
            }
          }
          return o
        })
      }

      for(const date of this.dates) {
        const calendarEvent = localStorage.getItem(date.id)

        if(calendarEvent) {
          putItem(JSON.parse(calendarEvent))
        }
      }
    }

    handleClickButtonPrev() {
        if(this.month === 0) {
            this.month = 11
            this.year -= 1
          } else {
            this.month -=  1
        }

        this.getDatesOfMonth()
        this.getCalendarEvents()
    }

    handleClickButtonNext() {
        if(this.month === 11) {
            this.month = 0
            this.year += 1
          } else {
            this.month +=  1
        }

        this.getDatesOfMonth()
        this.getCalendarEvents()
    }

    handleClickButtonToday() {
      this.getDate()
      this.getDatesOfMonth()
      this.getCalendarEvents()
    }
    
    resetSelected = () => {
      const selectedDay = this.dates.find(d => d.id == this.selectedItemId)

      if(selectedDay) {
        selectedDay.class = selectedDay.class.split(' ').filter(с => с !== 'calendar-container__item_selected').join(' ')
        selectedDay.selected = false
      }
    }

    handleClickSelectedItem(e) {
      fireEvent(this.pageRef, 'closeheadermodal')

      if(this.selectedItemId && this.selectedItemId !== e.currentTarget.dataset.id) {
        this.resetSelected()
      }

      if(this.closeModal) {
        this.resetSelected()
        this.selectedItemId = null
        this.closeModal = false
        return
      }

      this.selectedItemId = e.currentTarget.dataset.id

      const selectedDay = this.dates.find(d => d.id == this.selectedItemId)

      if(selectedDay) {
        selectedDay.class += ' calendar-container__item_selected'
        selectedDay.selected = true
      }
    }

    handleCloseModal() {
      this.closeModal = true
    }

    handleCloseCalendarModal() {
      this.resetSelected()
      this.selectedItemId = null
    }

    handleCreateCalendarEvent(e) {
      const selectedDay = this.dates.find(d => d.id == this.selectedItemId)

      selectedDay.event = e.detail

      this.resetSelected()

      selectedDay.class += ' calendar-container__item_active'

      localStorage.setItem(selectedDay.id, JSON.stringify(selectedDay))

      this.closeModal = true
    }

    handleDeleteCalendarEvent() {
      const selectedDay = this.dates.find(d => d.id == this.selectedItemId)
  
      if(selectedDay.event) {
        delete selectedDay.event
        selectedDay.class = selectedDay.class.split(' ').filter(с => с !== 'calendar-container__item_active').join(' ')
        localStorage.removeItem(selectedDay.id)
      }

      this.closeModal = true
    }

    handleCreateEventHeader(e) {
      const day = this.dates.find(d => d.id == e.eventDate.toISOString())

      if(day) {
        day.event = {
          eventText: e.eventText,
          eventDate: e.eventDate.toLocaleString().slice(0, 10) ?? '',
          eventDateText: e.eventDateText,
          participantNames: '',
          eventDescription: e.eventDescription
        }

        day.class += ' calendar-container__item_active'

        localStorage.setItem(day.id, JSON.stringify(day))
      } else {
        localStorage.setItem(e.eventDate.toISOString(), JSON.stringify({
          id: e.eventDate.toISOString(),
          key: e.eventDate,
          day: e.day + "",
          class: 'calendar-container__item calendar-container__item_active',
          selected: false,
          event: {
            eventText: e.eventText,
            eventDate: e.eventDate.toLocaleString().slice(0, 10),
            eventDateText: e.eventDateText,
            participantNames: '',
            eventDescription: e.eventDescription
          }
        }))
      }
    }

    handleSelectSearchEventItem(e) {
      const addSelectedClass = (id) => {
        const day = this.dates.find(d => d.id == id)

        if(day) {
          this.selectedItemId = id
          day.class += ' calendar-container__item_selected'
          return 1
        } else {
          return 0
        }
      }

      if(!addSelectedClass(e.id)) {
        const date = new Date(e.id)
        const [month, year] = [date.getMonth(), date.getFullYear()]

        this.month = month
        this.year = year

        this.getDatesOfMonth()
        this.getCalendarEvents()

        addSelectedClass(e.id)
      }
    }
}
