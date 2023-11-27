import { LightningElement, api, track, wire } from 'lwc'
import { CurrentPageReference } from 'lightning/navigation'
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export default class Modal extends LightningElement {

    eventText = ''
    eventDate = ''
    participantNames = ''
    eventDescription = ''

    eventHeaderText = ''

    @api type
    @api date
    @api close
    @api search

    @track firstRender = true
    @track error = false
    @track hasEventOnThisDateError = false
    @track calendarEvents = []
    @track duplicateCalendarEvents = []

    @wire(CurrentPageReference) pageRef

    connectedCallback() {
        registerListener('searchcalendarevent', this.handleSearchCalendarEvent, this)
    }
  
    disconnectedCallback() {
        unregisterAllListeners(this)
    }

    renderedCallback() {
        if (this.firstRender) {
            this.firstRender = false

            if(this.date) {
                this.eventText = this.date.event?.eventText ?? ''
                this.eventDate = new Date(this.date.id)?.toLocaleString().slice(0, 10) ?? ''
                this.participantNames = this.date.event?.participantNames ?? ''
                this.eventDescription = this.date.event?.eventDescription ?? ''
            }

            if(this.search) {
                this.getCalendarEvents()
            }
        }
    }

    get isCreateEventCalendar() {
        return this.type === 'createEventCalendar'
    }

    get isCreateEventHeader() {
        return this.type === 'createEventHeader'
    }

    get isSearchEventHeader() {
        return this.type === 'searchEventHeader'
    }

    get getCalendarClass() {
        switch (this.type) {
            case 'createEventCalendar':
                return `calendar-modal calendar-modal__position_${[0, 6, 5].includes(new Date(this.date.id).getDay()) ? 'left' : 'right'}`
            case 'createEventHeader':
                return 'calendar-modal calendar-modal__position_header'
            case 'searchEventHeader':
                return 'calendar-modal calendar-modal__position_search'

            default:
                return 'calendar-modal'
        }
    }

    get getCalendarWrapperClass() {
        return 'calendar-modal__wrapper' + (this.type === 'searchEventHeader' ? ' calendar-modal__wrapper_search' : '')
    }

    get getTriangleClass() {
        return 'calendar-modal__triangle' + (this.type === 'createEventCalendar'
            ? ` calendar-modal__triangle_${[0, 6, 5].includes(new Date(this.date.id).getDay()) ? 'right' : 'left'}`
            : ['createEventHeader', 'searchEventHeader'].includes(this.type)
            ? ' calendar-modal__triangle_header'
            : '')
    }

    get getCalendarEventInputClass() {
        return 'calendar-modal__input' + (this.error && !this.eventText ? ' calendar-modal__input_error' : '')
    }

    get getCalendarEventHeaderInputClass() {
        return 'calendar-modal__input' + (this.error ? ' calendar-modal__input_error' : '')
    }

    get showCloseButton() {
        return this.close === 'disable' ? 0 : 1
    }

    handleCloseModal() {
        this.dispatchEvent(new CustomEvent('closemodal'))
    }

    handleChange(e) {
        const field = e.target.name
        if (field === 'eventText') {
          this.eventText = e.target.value
        } else if (field === 'participantNames') {
          this.participantNames = e.target.value
        } else if(field === 'eventDate') {
          this.eventDate = e.target.value
        } else if(field === 'eventDescription') {
          this.eventDescription = e.target.value
        } else if(field === 'eventHeaderText') {
          this.eventHeaderText = e.target.value
          this.error = false
          this.hasEventOnThisDateError = false
        }
    }

    handleCreateEvent() {
        const payload = {
            detail: {
                eventText: this.eventText,
                eventDate: this.eventDate,
                eventDateText: `${new Date(this.date.id).getDate()} ${MONTHS[new Date(this.date.id).getMonth()]}`,
                participantNames: this.participantNames,
                eventDescription: this.eventDescription
            }
        }

        if(this.eventText) {
            this.dispatchEvent(new CustomEvent('createcalendarevent', payload))
        } else {
            this.error = true
        }
    }

    handleDeleteEvent() {
        this.dispatchEvent(new CustomEvent('deletecalendarevent'))
    }

    handleCreateEventHeader() {
        const data = this.eventHeaderText.split(', ')

        if(data.length !== 3) {
            return
        }

        const [date, eventDescription, eventText] = data
        const [day, month] = date.split(' ')
        const numMonth = MONTHS.indexOf(month?.toLowerCase())
        const currYear = new Date().getFullYear()

        if(day > 0 && day <= 31 && numMonth >= 0) {
            const hasEventOnThisDate = localStorage.getItem(new Date(currYear, numMonth, day).toISOString())

            if(hasEventOnThisDate) {
                this.hasEventOnThisDateError = true
                return
            }

            fireEvent(this.pageRef, 'createcalendareventheader', {
                day,
                eventDate: new Date(currYear, numMonth, day), 
                eventDescription, 
                eventText,
                eventDateText: `${day} ${MONTHS[numMonth]}`
            })

            this.dispatchEvent(new CustomEvent('closemodal'))
        } else {
            this.error = true
        }
    }

    getCalendarEvents() {
        for(let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            this.calendarEvents.push(JSON.parse(localStorage.getItem(key)))
        }
    }

    handleSearchCalendarEvent(e) {
        if (e) {
            this.duplicateCalendarEvents = [...this.calendarEvents].reduce((acc, val) => {
              if (val.event.eventText.toLowerCase().includes(e.textSearch.trim().toLowerCase())) {
                return [...acc, val]
              }

              if (val.event.eventDateText.toLowerCase().includes(e.textSearch.trim().toLowerCase())) {
                return [...acc, val]
              }

              if (val.event.participantNames.toLowerCase().includes(e.textSearch.trim().toLowerCase())) {
                return [...acc, val]
              }

              return acc
            }, [])
        } else {
            this.duplicateCalendarEvents = [...this.calendarEvents]
        }
    }

    handleSelectSearchEventItem(e) {
        const selectedEvent = this.duplicateCalendarEvents.find(d => d.id == e.currentTarget.dataset.id)

        if(selectedEvent) {
            fireEvent(this.pageRef, 'selectsearcheventitem', {
                id: e.currentTarget.dataset.id
            })

            this.dispatchEvent(new CustomEvent('closemodal'))
        }
    }
}