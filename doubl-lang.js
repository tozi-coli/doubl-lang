/*      doubl.lang      */
// a corru.observer mod for viewing english dialogues with their localized counterparts in-game simultaneously
// by @dutokrisa (discord). contact it for any bug-fixes or questions




if (typeof doubllang == 'undefined') {
    doubllang = {}

    doubllang.css = document.createElement('style').appendChild(document.createTextNode(`
    #dialogue-box-doubllang {
        width: 30vw;
        padding: 0;
        padding-bottom: 15vh;
        transform: translateX(50vw);
        z-index: 20;
    }
    .in-dialogue #dialogue-box-doubllang {
        transform: translateX(0vw);
        pointer-events: initial;
    }
    .doubllang-goleft {left:0;}`)).parentElement

    doubllang.dialoguebox = document.createElement('div')
    doubllang.dialoguebox.setAttribute("id", "dialogue-box-doubllang")
    doubllang.dialoguebox.setAttribute("class", "menu-box menu")
    doubllang.dialoguebox.setAttribute("menu","dialogue")

    document.head.appendChild(doubllang.css)
    document.body.appendChild(doubllang.dialoguebox)
}


function startDialogue(dialogueChain, settings = {
    originEntityID: null, 
    specificChain: false, 
    chatterlogue: false // special mode that lets you move and talk. doesn't count as a menu, but occupies the right side of the screen
}) {
    if(env.currentDialogue.active || !env.currentDialogue.canStart || check("TEMP!!nodialogue")){
        env.error = `tried to start dialogue ${dialogueChain} but either currently in dialogue or too soon after previous dialogue. consider using CHANGE::`
        return 
    }
    //if origin entity is set, we keep track of that entity and also highlight it somehow (usually for dynamic purposes related)
    if(settings.originEntityID) {
        env.currentDialogue.originEntityID = `#${settings.originEntityID}`
             
        if(env.stage.current) [env.stage.real, env.stage.ref].forEach(layer => {
            layer.querySelectorAll(settings.originEntityID).forEach(e => {
                e.classList.add('dialogue-origin')
            })
        })
        
    } else env.currentDialogue.originEntityID = null

    env.currentDialogue.settings = settings
    env.currentDialogue.canStart = false
    env.dialogueBox = document.getElementById("dialogue-box")

    doubllang.dialoguebox.setAttribute("class", "menu-box menu doubllang-goleft") // doubl.lang code addition

    if(settings.chatterlogue) {
        body.classList.add('in-chatterlogue')
        env.dialogueBox.classList.add("chatterlogue")
    } else {
        body.classList.add('in-dialogue')
        env.dialogueBox.classList.remove("chatterlogue")
    }

    //if the player is in a freemouse stage state, we pause that
    if(env?.stage?.freemove && !settings.chatterlogue) {
        setTimeout(() => {
            if(!env.forcingSwap) pauseFreemove(true)
        }, 50)
    }

    if(body.classList.contains('mui-active') || body.getAttribute("menu") != "none") exitMenu()

    if(!env.currentDialogue.active) { //if dialogue isn't active already, start the dialogue
        if(!settings.chatterlogue) body.classList.add('in-menu')

        setTimeout(()=>{
            body.setAttribute('currentDialogue', dialogueChain)
            document.getElementById('dialogue-box').classList.toggle("can-skip", env.currentDialogue.chain?.skip ? true : false)
        }, stageAngleReset()) //stageAngleReset is a timing and camera movement function from cystStage that helps make sure things are timed right

        const localization = getLocalizationForPage()
        if(localization.dialogues) env.currentDialogue.chain = localization.dialogues[`${page.dialoguePrefix}__${dialogueChain}`] || localization.dialogues[dialogueChain] || env.dialogues[dialogueChain]
        else env.currentDialogue.chain = env.dialogues[dialogueChain]
        
        env.currentDialogue.chainName = dialogueChain
        try {
            sendDialogue(typeof settings?.specificChain == "undefined" || settings?.specificChain === false ? env.currentDialogue.chain.start : env.currentDialogue.chain[settings?.specificChain])
        } catch(e) { printError(`dialogue error for ${dialogueChain}: ` + e, true); setTimeout(()=>endDialogue(), 2000)}
        env.currentDialogue.active = true

        //identify actors and add them as objects within the currentDialogue object for ease of use
        env.currentDialogue.actors = {}
        for (const topicName in env.currentDialogue.chain) {
            //ignore some special strings
            if(!["end", "skip", "skipTime", "skipNotice"].includes(topicName)) {
                env.currentDialogue.chain[topicName].body.forEach(dialogue => {
                    env.currentDialogue.actors[dialogue.actor] = getDialogueActor(dialogue.actor, true)
                })
            }
        }
    }

    // based on the groundsmindry approach
    // page-based tracking for having seen the dialogue...
    // this probably won't cause any issues :^)
    change(`PAGE!!${dialogueChain}`, true)
}

function endDialogue(endCallback = false) {
    body.removeAttribute('currentDialogue')
    body.classList.remove('in-dialogue', 'in-menu', 'in-chatterlogue')

    env.currentDialogue.active = false
    env.currentDialogue.prevSpeaker = false
    
    if(env.stage.current) [env.stage.real, env.stage.ref].forEach(layer => {
        layer.querySelectorAll(env.currentDialogue.originEntityID).forEach(e => {
            e.classList.remove('dialogue-origin')
        })
    })

    doubllang.dialoguebox.setAttribute("class", "menu-box menu") // doubl.lang code addition
    
    markThisDialogueSeen('end')
    fixDialogueEnd()
    fixSkipDialogueBug()

    if(!env.forcingSwap) pauseFreemove(false, false)
    checkEpisodeProgress()
	setTimeout(()=>{
        env.currentDialogue.canStart = true
        document.querySelector('#dialogue-box').innerHTML = ""
        if(endCallback) endCallback()
    }, 500)

    if(dialogueProgressEvent) {
        dBox.removeEventListener('mousedown', dialogueProgressEvent)
        document.removeEventListener('keydown', dialogueProgressEvent)
    }

    if(env.dialogueWaitTimeout) {
        clearTimeout(env.dialogueWaitTimeout)
        delete env.dialogueWaitTimeout
    }
}

function skipDialogue() {
    if(!env.currentDialogue?.chain?.skip) return;
    if(env.skipDialog) return;
    markThisDialogueSeen()
    play("muiClick", 3)
    
    env.skipDialog = document.createElement('div')
    env.skipDialog.id = 'dialogue-skip'
    env.skipDialog.innerHTML = `
      ${env.currentDialogue.chain.skipNotice ? `<span class="skip-notice">NOTICE::'${env.currentDialogue.chain.skipNotice}'</span>` : ""}
      <div class="skip-dialog">
        <button id="skip-yes" class="button" onmouseenter="play('muiHover')" onclick="play('muiClick');env.skipDialogYes()">confirm</button>
        <button id="skip-no" class="button" onmouseenter="play('muiHover')" onclick="play('muiClick');env.skipDialogNo()">retract</button>
      </div>
    `
    document.body.appendChild(env.skipDialog)
    doubllang.dialoguebox.setAttribute("class", "menu-box menu") // doubl.lang code addition

    env.skipDialogYes = () => {
        env.skipDialog.remove()
        delete env.skipDialog

        if(!env?.currentDialogue?.active) return;

        vfx({type: "skip", state: true, useCutscene: true})
        let vol = Howler.volume()

        setTimeout(() => {
            vfx({type: "skip", state: false, useCutscene: false})
            Howler.volume(vol)
        }, env?.currentDialogue?.chain?.skipTime || 1000)

        env.currentDialogue.chain.skip()
        endDialogue(env.currentDialogue.chain.end)
        Howler.volume(0)
    }

    env.skipDialogNo = () => {
        env.skipDialog.remove()
        delete env.skipDialog
    }
}

function clearDialogueMenu() {
    var dMenu = document.getElementById('dialogue-menu')
    if(dMenu) {
        dMenu.classList.add('dialogue-menu')
        dMenu.id = ""
    }
    var dMenudoubl = document.getElementById('dialogue-menu-doubllang')
    if(dMenudoubl) {
        dMenudoubl.classList.add('dialogue-menu-doubllang')
        dMenudoubl.id = ""
    }
}

function sendDialogue(dialogue, i = 0) {
    if(env.skipDialog) return; // don't proceed if there's a skip dialog

    try {
        env.currentDialogue.branch = dialogue
        let queue = dialogue.body
        if(!dBox) dBox = document.getElementById('dialogue-box') // defined here bc this script is loaded ahead of page content
        var dMenu = document.getElementById('dialogue-menu') //this is redefined later

        //removes ID and adds dialogue-menu class to set it inactive, effectively preparing the next one
        //may not exist if starting dialogue
        clearDialogueMenu()

        //removes the listener after it's started so it can't be called multiple times, useful for ones with 'wait'
        dBox.removeEventListener('mousedown', dialogueProgressEvent)
        document.removeEventListener('keydown', dialogueProgressEvent)

        if(i < queue.length) {
            if(shouldItShow(queue[i])) {
                dBox.classList.add('dialogue-click-proceed')
                let current = queue[i]
                let currentActor = getDialogueActor(current.actor)

                //the current dialogue bubble doesn't have text - therefore it has a texec (text exec) to generate the response
                if(typeof current.texec == 'function') {
                    current.text = current.texec()
                }

                //log the dialogue in the readout too
                if(current.actor != "unknown") readoutAdd({message: current.text, image: currentActor.image, name: current.actor, displayName: currentActor.name, type: currentActor.type, sfx: false, actor: current.actor, show: false})

                //execute any code attached to the message
                if(current.exec) {
                    try { current.exec() } catch(e) {printError(e); console.log(e)}
                }

                //play any actor voice sfx, stop any previous voices
                if(!current.silent) {
                    if(currentActor.voice !== false && env.currentDialogue.prevSpeaker != current.actor && env.currentDialogue.prevSpeaker != "nobody stupid" && env.currentDialogue.prevSpeaker != "dialogue choice" && !env.noVoiceStop) sfxmap.stop()
                    if(typeof currentActor.voice == "function" || typeof currentActor.activeVoice == "function") {
                        if(currentActor.activeVoice) currentActor.activeVoice(); else currentActor.voice()
                    } else if(currentActor.voice !== false) {
                        play('muiReadout')
                    }
                }

                //hide the portrait if it's the last person who talked, otherwise add one
                var portrait = ""
                if(current.actor != env.currentDialogue.prevSpeaker && currentActor.image) portrait += `<div class="dialogue-portrait" style="--background-image: url(${currentActor.image});"></div>`
                env.currentDialogue.prevSpeaker = current.actor

                //create the dialogue message block
                let newLine = `
                    <div class="dialogue-message actor-${current.actor.replace("::", " expression__")} ${currentActor.player ? "from-player" : ""} ${currentActor.type} ${current.class || ""}">
                        ${portrait}
                        <div class="dialogue-text">
                            ${currentActor.noProcess ? current.text : processDefinitionsInString(current.text)}
                        </div>
                    </div>
                    `
                dBox.insertAdjacentHTML('beforeend', newLine)
                setTimeout(()=>{document.querySelector('.dialogue-message:last-of-type').classList.add('sent')}, current.autoAdvance ? 0 : 50)

                //update the event listener to proceed to the next line
                if(current.wait) dBox.classList.remove('dialogue-click-proceed')
                env.dialogueWaitTimeout = setTimeout(()=>{
                    if(current.autoAdvance) {
                        sendDialogue(dialogue, i + 1)

                    } else {
                        dialogueProgressEvent = (event)=>{
                            let key = event.key || false
                            if(env.cutscene) return;
                            if(key) {
                                switch(key) {
                                    case " ":
                                    case "Enter": break

                                    case "Escape": return skipDialogue();
                                    default: return;
                                }
                            }

                            sendDialogue(dialogue, i + 1)
                        }
        
                        setTimeout(function(){
                            dBox.addEventListener('mousedown', dialogueProgressEvent);
                            document.addEventListener('keydown', dialogueProgressEvent);
                            dBox.classList.add('dialogue-click-proceed')
                        }, 100)
                    }
                    if(current.then) current.then();

                    delete env.dialogueWaitTimeout
                }, (current.wait || 1))
            } else {
                sendDialogue(dialogue, i + 1)
            }

        } else { //the dialogue chain is over, show responses
            env.currentDialogue.prevSpeaker = "nobody stupid"
            env.currentDialogue.justChanged = false
            dBox.classList.remove('dialogue-click-proceed')
            dBox.removeEventListener('mousedown', dialogueProgressEvent)
            document.removeEventListener('keydown', dialogueProgressEvent)
            dBox.insertAdjacentHTML('beforeend', `<div id="dialogue-menu"></div>`)

            dMenu = document.getElementById('dialogue-menu') //there's a new dialogue menu--the old one is now inactive

            //sets flag for seeing the sent dialogue
            markThisDialogueSeen()

            dialogue.responses.forEach(actor => {
                let actorObj = getDialogueActor(actor.name, true)
                dMenu.insertAdjacentHTML('beforeend', `
                    <div class="dialogue-actor ${actorObj.type} dialogue-options-${actor.name} actor-${actor.name}">
                        <div class="dialogue-portrait" style="--background-image: url(${actorObj.image})"></div>
                        <div class="dialogue-options"></div>                    
                    </div>
                `)

                actor.replies.forEach(reply => {
                    console.log(`SHOULD REPLY ${reply.name} SHOW? ::: ${shouldItShow(reply)}`)
                    let show = shouldItShow(reply)

                    if(show) {
                        console.log(`determined ${show}, so showing reply`)

                        //programmatically decide the reply name that shows if the reply name is a function
                        let nameToUse
                        if(typeof reply.name == "function") nameToUse = reply.name() // this case is an ancient holdover from before the dialogue string syntax
                        else if(reply.texec) nameToUse = reply.texec()
                        else nameToUse = reply.name.trim()
                        
                        //determine what kind of unread it is, if any
                        let readState
                        if(typeof reply.unreadCheck == "function") readState = reply.unreadCheck();
                        else readState = checkUnread(reply);

                        if(readState == false) readState = "read"
                        var readAttribute = reply.hideRead ? 'read="hidden"' : `read=${readState}`

                        //detect if it's an end reply, and if it should have custom 'tiny' text
                        var isEnd
                        if(reply.fakeEnd || reply.destination == "END") isEnd = reply.fakeEnd || processStringTranslation("(end chat)")

                        //detect what definition to show
                        var tooltip 
                        if(!isEnd){
                            tooltip = "NOTE::"
                            if(!reply.hideRead) {
                                if(reply.class) {
                                    switch(readState) {
                                        case "read":
                                            tooltip += `'has no unutilized responses'`;
                                        break

                                        case "unread":
                                        case "within":
                                            tooltip += `'has unutilized responses'`;
                                    }
                                } else {
                                    switch(readState) {
                                        case "read":
                                            tooltip += `'previously utilized response'`
                                        break

                                        case "unread":
                                            tooltip += `'response not yet utilized'`
                                        break

                                        case "within":
                                            tooltip += `'response leads to unused responses'`
                                    }
                                }
                            } else {
                                tooltip += `'dynamic response'`
                            }
                        }

                        if(reply.definition) tooltip = reply.definition;

                        //add the reply and set up its click handler
                        document.querySelector(`#dialogue-menu .dialogue-options-${actor.name} .dialogue-options`).insertAdjacentHTML('beforeend', `
                            <span
                                class="
                                    reply
                                    ${isEnd ? "end-reply" : ""}
                                    ${reply.class || ""}
                                "
                                reply="${reply.destination}" 
                                name="${nameToUse}"
                                ${tooltip ? `definition="${tooltip}"` : ""}
                                ${!isEnd ? readAttribute : ""} 
                                ${isEnd ? `endtext="${isEnd}"` : ''}
                            >${nameToUse}</span>`
                        )

                        //on option click, remove event listeners and add classes to indicate choice
                        document.querySelector(`#dialogue-menu .dialogue-options span[name="${nameToUse}"]`).addEventListener('mousedown', function(e) {
                            console.log(nameToUse)

                            if(reply.exec) {
                                try { reply.exec() } catch(e) {printError(e); console.log(e)}
                            }

                            var dest = reply.destination
                            //redefine dest as something more readable if it's a function
                            if(dest.includes('EXEC::')) {
                                dest = `EX-${slugify(nameToUse.slice(0, 10))}`
                            }
                            
                            document.querySelectorAll('#dialogue-menu .dialogue-options span').forEach(el => el.innerHTML += '') //destroys event listeners in one easy step
                            this.classList.add('chosen')
                            this.closest('.dialogue-actor').classList.add('chosen')

                            //determine how to handle the reply based on any special prefixes or names
                            let replyValue = this.attributes.reply.value
                            if(replyValue == "END") { //end of dialogue
                                endDialogue(env.currentDialogue.chain.end)
                            } else if(replyValue.includes('CHANGE::')) { //changing to different dialogue
                                let changeValue = replyValue.replace('CHANGE::', '')
                                changeDialogue(changeValue)
                            } else if(replyValue.includes('EXEC::')) { //executing a function - the function given should end dialogue or change it, otherwise may softlock
                                Function(`${replyValue.replace('EXEC::', '')}`)()
                                clearDialogueMenu()
                            } else {
                                sendDialogue(env.currentDialogue.chain[replyValue])
                            }
                        })
                    }
                })
            })

            document.querySelectorAll(`#dialogue-menu .dialogue-options span`).forEach(e=>{
                e.addEventListener('mouseenter', ()=>play('muiHover'))
                e.addEventListener('click', ()=> play('muiClick'))
            })

            //show only if the actor has any valid/choosable options
            setTimeout(()=>{document.querySelectorAll('#dialogue-menu .dialogue-actor').forEach(e=> {
                if(e.querySelector('.dialogue-options').childElementCount) e.classList.add('sent')
                else e.remove()
            })}, 50)
        }
        
        dBox.scrollTop = dBox.scrollHeight
    } catch(e) {
        printError(e)
        if(!check("TEMP!!debug")) endDialogue()
    }

    doubllang.sendDialogue(dialogue, i) // doubl.lang code addition
}

var dBoxdoubl
doubllang.sendDialogue = function (dialogue, i = 0) {
    if(env.skipDialog) return; // don't proceed if there's a skip dialog

    try {
        env.currentDialogue.branch = dialogue
        let queue = dialogue.body
        if(!dBoxdoubl) dBoxdoubl = document.getElementById('dialogue-box-doubllang') // defined here bc this script is loaded ahead of page content
        var dMenudoubl = document.getElementById('dialogue-menu-doubllang') //this is redefined later

        //removes ID and adds dialogue-menu class to set it inactive, effectively preparing the next one
        //may not exist if starting dialogue
        clearDialogueMenu()

        //removes the listener after it's started so it can't be called multiple times, useful for ones with 'wait'
        dBoxdoubl.removeEventListener('mousedown', dialogueProgressEvent)
        document.removeEventListener('keydown', dialogueProgressEvent)

        if(i < queue.length) {
            if(shouldItShow(queue[i])) {
                dBoxdoubl.classList.add('dialogue-click-proceed')
                let current = queue[i]
                let currentActor = getDialogueActor(current.actor)

                //the current dialogue bubble doesn't have text - therefore it has a texec (text exec) to generate the response
                if(typeof current.texec == 'function') {
                    current.text = current.texec()
                }

                //log the dialogue in the readout too
                if(current.actor != "unknown") readoutAdd({message: current.text, image: currentActor.image, name: current.actor, displayName: currentActor.name, type: currentActor.type, sfx: false, actor: current.actor, show: false})

                //execute any code attached to the message
                if(current.exec) {
                    try { current.exec() } catch(e) {printError(e); console.log(e)}
                }

                //play any actor voice sfx, stop any previous voices
                if(!current.silent) {
                    if(currentActor.voice !== false && env.currentDialogue.prevSpeaker != current.actor && env.currentDialogue.prevSpeaker != "nobody stupid" && env.currentDialogue.prevSpeaker != "dialogue choice" && !env.noVoiceStop) sfxmap.stop()
                    if(typeof currentActor.voice == "function" || typeof currentActor.activeVoice == "function") {
                        if(currentActor.activeVoice) currentActor.activeVoice(); else currentActor.voice()
                    } else if(currentActor.voice !== false) {
                        play('muiReadout')
                    }
                }

                //hide the portrait if it's the last person who talked, otherwise add one
                var portrait = ""
                if(current.actor != env.currentDialogue.prevSpeaker && currentActor.image) portrait += `<div class="dialogue-portrait" style="--background-image: url(${currentActor.image});"></div>`
                env.currentDialogue.prevSpeaker = current.actor

                //create the dialogue message block
                let newLine = `
                    <div class="dialogue-message actor-${current.actor.replace("::", " expression__")} ${currentActor.player ? "from-player" : ""} ${currentActor.type} ${current.class || ""}">
                        ${portrait}
                        <div class="dialogue-text">
                            ${currentActor.noProcess ? current.text : processDefinitionsInString(current.text)}
                        </div>
                    </div>
                    `
                dBoxdoubl.insertAdjacentHTML('beforeend', newLine)
                setTimeout(()=>{document.querySelector('.dialogue-message:last-of-type').classList.add('sent')}, current.autoAdvance ? 0 : 50)

                //update the event listener to proceed to the next line
                if(current.wait) dBoxdoubl.classList.remove('dialogue-click-proceed')
                env.dialogueWaitTimeout = setTimeout(()=>{
                    if(current.autoAdvance) {
                        sendDialogue(dialogue, i + 1)

                    } else {
                        dialogueProgressEvent = (event)=>{
                            let key = event.key || false
                            if(env.cutscene) return;
                            if(key) {
                                switch(key) {
                                    case " ":
                                    case "Enter": break

                                    case "Escape": return skipDialogue();
                                    default: return;
                                }
                            }

                            sendDialogue(dialogue, i + 1)
                        }
        
                        setTimeout(function(){
                            dBoxdoubl.addEventListener('mousedown', dialogueProgressEvent);
                            document.addEventListener('keydown', dialogueProgressEvent);
                            dBoxdoubl.classList.add('dialogue-click-proceed')
                        }, 100)
                    }
                    if(current.then) current.then();

                    delete env.dialogueWaitTimeout
                }, (current.wait || 1))
            } else {
                sendDialogue(dialogue, i + 1)
            }

        } else { //the dialogue chain is over, show responses
            env.currentDialogue.prevSpeaker = "nobody stupid"
            env.currentDialogue.justChanged = false
            dBoxdoubl.classList.remove('dialogue-click-proceed')
            dBoxdoubl.removeEventListener('mousedown', dialogueProgressEvent)
            document.removeEventListener('keydown', dialogueProgressEvent)
            dBoxdoubl.insertAdjacentHTML('beforeend', `<div id="dialogue-menu-doubllang"></div>`)

            dMenudoubl = document.getElementById('dialogue-menu-doubllang') //there's a new dialogue menu--the old one is now inactive

            //sets flag for seeing the sent dialogue
            markThisDialogueSeen()

            dialogue.responses.forEach(actor => {
                let actorObj = getDialogueActor(actor.name, true)
                dMenudoubl.insertAdjacentHTML('beforeend', `
                    <div class="dialogue-actor ${actorObj.type} dialogue-options-${actor.name} actor-${actor.name}">
                        <div class="dialogue-portrait" style="--background-image: url(${actorObj.image})"></div>
                        <div class="dialogue-options"></div>                    
                    </div>
                `)

                actor.replies.forEach(reply => {
                    console.log(`SHOULD REPLY ${reply.name} SHOW? ::: ${shouldItShow(reply)}`)
                    let show = shouldItShow(reply)

                    if(show) {
                        console.log(`determined ${show}, so showing reply`)

                        //programmatically decide the reply name that shows if the reply name is a function
                        let nameToUse
                        if(typeof reply.name == "function") nameToUse = reply.name() // this case is an ancient holdover from before the dialogue string syntax
                        else if(reply.texec) nameToUse = reply.texec()
                        else nameToUse = reply.name.trim()
                        
                        //determine what kind of unread it is, if any
                        let readState
                        if(typeof reply.unreadCheck == "function") readState = reply.unreadCheck();
                        else readState = checkUnread(reply);

                        if(readState == false) readState = "read"
                        var readAttribute = reply.hideRead ? 'read="hidden"' : `read=${readState}`

                        //detect if it's an end reply, and if it should have custom 'tiny' text
                        var isEnd
                        if(reply.fakeEnd || reply.destination == "END") isEnd = reply.fakeEnd

                        //detect what definition to show
                        var tooltip 
                        if(!isEnd){
                            tooltip = "NOTE::"
                            if(!reply.hideRead) {
                                if(reply.class) {
                                    switch(readState) {
                                        case "read":
                                            tooltip += `'has no unutilized responses'`;
                                        break

                                        case "unread":
                                        case "within":
                                            tooltip += `'has unutilized responses'`;
                                    }
                                } else {
                                    switch(readState) {
                                        case "read":
                                            tooltip += `'previously utilized response'`
                                        break

                                        case "unread":
                                            tooltip += `'response not yet utilized'`
                                        break

                                        case "within":
                                            tooltip += `'response leads to unused responses'`
                                    }
                                }
                            } else {
                                tooltip += `'dynamic response'`
                            }
                        }

                        if(reply.definition) tooltip = reply.definition;

                        //add the reply and set up its click handler
                        document.querySelector(`#dialogue-menu-doubllang .dialogue-options-${actor.name} .dialogue-options`).insertAdjacentHTML('beforeend', `
                            <span
                                class="
                                    reply
                                    ${isEnd ? "end-reply" : ""}
                                    ${reply.class || ""}
                                "
                                reply="${reply.destination}" 
                                name="${nameToUse}"
                                ${tooltip ? `definition="${tooltip}"` : ""}
                                ${!isEnd ? readAttribute : ""} 
                                ${isEnd ? `endtext="${isEnd}"` : ''}
                            >${nameToUse}</span>`
                        )

                        //on option click, remove event listeners and add classes to indicate choice
                        document.querySelector(`#dialogue-menu-doubllang .dialogue-options span[name="${nameToUse}"]`).addEventListener('mousedown', function(e) {
                            console.log(nameToUse)

                            if(reply.exec) {
                                try { reply.exec() } catch(e) {printError(e); console.log(e)}
                            }

                            var dest = reply.destination
                            //redefine dest as something more readable if it's a function
                            if(dest.includes('EXEC::')) {
                                dest = `EX-${slugify(nameToUse.slice(0, 10))}`
                            }
                            
                            document.querySelectorAll('#dialogue-menu-doubllang .dialogue-options span').forEach(el => el.innerHTML += '') //destroys event listeners in one easy step
                            this.classList.add('chosen')
                            this.closest('.dialogue-actor').classList.add('chosen')

                            //determine how to handle the reply based on any special prefixes or names
                            let replyValue = this.attributes.reply.value
                            if(replyValue == "END") { //end of dialogue
                                endDialogue(env.currentDialogue.chain.end)
                            } else if(replyValue.includes('CHANGE::')) { //changing to different dialogue
                                let changeValue = replyValue.replace('CHANGE::', '')
                                changeDialogue(changeValue)
                            } else if(replyValue.includes('EXEC::')) { //executing a function - the function given should end dialogue or change it, otherwise may softlock
                                Function(`${replyValue.replace('EXEC::', '')}`)()
                                clearDialogueMenu()
                            } else {
                                sendDialogue(env.currentDialogue.chain[replyValue])
                            }
                        })
                    }
                })
            })

            document.querySelectorAll(`#dialogue-menu-doubllang .dialogue-options span`).forEach(e=>{
                e.addEventListener('mouseenter', ()=>play('muiHover'))
                e.addEventListener('click', ()=> play('muiClick'))
            })

            //show only if the actor has any valid/choosable options
            setTimeout(()=>{document.querySelectorAll('#dialogue-menu-doubllang .dialogue-actor').forEach(e=> {
                if(e.querySelector('.dialogue-options').childElementCount) e.classList.add('sent')
                else e.remove()
            })}, 50)
        }
        
        dBoxdoubl.scrollTop = dBoxdoubl.scrollHeight
    } catch(e) {
        printError(e)
        if(!check("TEMP!!debug")) endDialogue()
    }
}