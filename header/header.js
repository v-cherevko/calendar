import { LightningElement, track, wire } from 'lwc'
import { CurrentPageReference } from 'lightning/navigation'
import { registerListener, unregisterAllListeners, fireEvent } from 'c/pubsub'

export default class Header extends LightningElement {

    textSearch = ''
    isFirstSearch = true

    @track showCreateEventModal = false
    @track showSearchEventModal = false

    @wire(CurrentPageReference) pageRef

    connectedCallback() {
        registerListener('closeheadermodal', this.handleCloseHeaderModals, this)
    }
  
    disconnectedCallback() {
        unregisterAllListeners(this)
    }

    get showClearButton() {
        return this.textSearch ? 1 : 0
    }

    openModal() {
        if(this.showSearchEventModal) {
            this.handleCloseSearchEventModal()
        }

        fireEvent(this.pageRef, 'closecalendarmodal')

        this.showCreateEventModal = true
    }

    handleCloseHeaderModal() {
        this.showCreateEventModal = false
    }

    handleCloseSearchEventModal() {
        this,this.textSearch = ''
        this.showSearchEventModal = false
        this.isFirstSearch = true
    }

    handleCloseHeaderModals() {
        if(this.showCreateEventModal) {
            this.handleCloseHeaderModal()
        } else if(this.showSearchEventModal) {
            this.handleCloseSearchEventModal()
        }
    }

    handleSearchEvent(e) {
        if(this.showCreateEventModal) {
            this.handleCloseHeaderModal()
        }

        if(this.isFirstSearch) {
            fireEvent(this.pageRef, 'closecalendarmodal')
            this.isFirstSearch = false
        }

        this.textSearch = e.target.value

        if(this.textSearch) {
            this.showSearchEventModal = true

            setTimeout(() => {
                fireEvent(this.pageRef, 'searchcalendarevent', { textSearch: this.textSearch })
            }, 0)
        } else {
            this.showSearchEventModal = false
        }
    }
}