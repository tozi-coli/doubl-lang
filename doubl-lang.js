/*      doubl.lang      */
// a corru.observer mod for viewing english dialogues with their localized counterparts in-game simultaneously
// by @dutokrisa (discord)


// WARNING:
// probably wont play nice with localized dialogues that have a different number of dialogue lines compared to the original
// and can bug out when localized dialogue is not present
// not friends with readouts either
// moth++ with their dynamic little comment gets weird but idgaf

// if there are serious bugs with the mod that make it straight up unusable, i could try to fix em, contact me, but most of the time it should be just incompatibilities with the way your own localization mod works or just really small stuff i dont really care about
// feel free to take this code and edit it to suit your needs




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
        transform: translateX(-45vw);
        pointer-events: initial;
    }
    .gothefuckaway-doubllang {
        transform: translateX(50vw) !important;
    }
    @media only screen and (max-width: 1366px) {#dialogue-box-doubllang {width: 40%}
    #dialogue-box-doubllang.dialogue-click-proceed::after {
        content: "VVV THIS ONE ISNT CLICKABLE VVV";
        display: block;
        width: 100%;
        text-align: center;
        animation: click-to-proceed 1s linear infinite;
    }
    
    #dialogue-menu-doubllang {
        margin-top: 1em;
        border-top: 1vh double var(--bright-color);
    } `)).parentElement

    doubllang.dialoguebox = document.createElement('div')
    doubllang.dialoguebox.setAttribute("id", "dialogue-box-doubllang")
    doubllang.dialoguebox.setAttribute("class", "menu-box menu")
    doubllang.dialoguebox.setAttribute("menu","dialogue")

    document.head.appendChild(doubllang.css)
    document.body.appendChild(doubllang.dialoguebox)

    doubllang.dBox
    doubllang.currentBranch
    doubllang.currentChain
}

function sendDialogue(dialogue, i = 0, locdialogue = false) {
    if(env.skipDialog) return; // don't proceed if there's a skip dialog

    try {
        env.currentDialogue.branch = dialogue
        let queue = dialogue.body
        if(!dBox) dBox = document.getElementById('dialogue-box') // defined here bc this script is loaded ahead of page content
        var dMenu = document.getElementById('dialogue-menu') //this is redefined later

        if(!doubllang.dBox) doubllang.dBox = document.getElementById('dialogue-box-doubllang') // DOUBL.LANG CODE ADDITION
        doubllang.dMenu = document.getElementById('dialogue-menu-doubllang') // DOUBL.LANG CODE ADDITION

        if (locdialogue == false) {
            locdialogue = dialogue
            doubllang.dBox.classList.add("gothefuckaway-doubllang")
        }// DOUBL.LANG CODE ADDITION

        doubllang.currentBranch = locdialogue // DOUBL.LANG CODE ADDITION
        doubllang.queue = locdialogue.body // DOUBL.LANG CODE ADDITION

        //removes ID and adds dialogue-menu class to set it inactive, effectively preparing the next one
        //may not exist if starting dialogue
        clearDialogueMenu()

        //removes the listener after it's started so it can't be called multiple times, useful for ones with 'wait'
        dBox.removeEventListener('mousedown', dialogueProgressEvent)
        document.removeEventListener('keydown', dialogueProgressEvent)

        if(i < queue.length) {
            if(shouldItShow(queue[i])) {
                dBox.classList.add('dialogue-click-proceed')
                doubllang.dBox.classList.add('dialogue-click-proceed')// DOUBL.LANG CODE ADDITION
                let current = queue[i]
                doubllangCurrent = doubllang.queue[i]
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
                let doubllangnewLine = `
                    <div class="dialogue-message doubllang-message actor-${current.actor.replace("::", " expression__")} ${currentActor.player ? "from-player" : ""} ${currentActor.type} ${current.class || ""}">
                        ${portrait}
                        <div class="dialogue-text">
                            ${currentActor.noProcess ? doubllangCurrent.text : processDefinitionsInString(current.text)}
                        </div>
                    </div>
                    `// DOUBL.LANG CODE ADDITION
                dBox.insertAdjacentHTML('beforeend', newLine)
                setTimeout(()=>{document.querySelector('.dialogue-message:last-of-type').classList.add('sent')}, current.autoAdvance ? 0 : 50)
                doubllang.dBox.insertAdjacentHTML('beforeend', doubllangnewLine) // DOUBL.LANG CODE ADDITION
                setTimeout(()=>{document.querySelector('.doubllang-message:last-of-type').classList.add('sent')}, current.autoAdvance ? 0 : 50)  // DOUBL.LANG CODE ADDITION

                //update the event listener to proceed to the next line
                if(current.wait) dBox.classList.remove('dialogue-click-proceed')
                if(current.wait) doubllang.dBox.classList.remove('dialogue-click-proceed')    // DOUBL.LANG CODE ADDITION
                env.dialogueWaitTimeout = setTimeout(()=>{
                    if(current.autoAdvance) {
                        sendDialogue(dialogue, i + 1, locdialogue)  // DOUBL.LANG CODE ADDITION

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

                            sendDialogue(dialogue, i + 1, locdialogue)  // DOUBL.LANG CODE ADDITION
                        }
        
                        setTimeout(function(){
                            dBox.addEventListener('mousedown', dialogueProgressEvent);
                            document.addEventListener('keydown', dialogueProgressEvent);
                            dBox.classList.add('dialogue-click-proceed')
                            doubllang.dBox.classList.add('dialogue-click-proceed') // DOUBL.LANG CODE ADDITION
                        }, 100)
                    }
                    if(current.then) current.then();

                    delete env.dialogueWaitTimeout
                }, (current.wait || 1))
            } else {
                sendDialogue(dialogue, i + 1, locdialogue)  // DOUBL.LANG CODE ADDITION
            }

        } else { //the dialogue chain is over, show responses
            env.currentDialogue.prevSpeaker = "nobody stupid"
            env.currentDialogue.justChanged = false
            dBox.classList.remove('dialogue-click-proceed')
            doubllang.dBox.classList.remove('dialogue-click-proceed') // DOUBL.LANG CODE ADDITION
            dBox.removeEventListener('mousedown', dialogueProgressEvent)
            document.removeEventListener('keydown', dialogueProgressEvent)
            dBox.insertAdjacentHTML('beforeend', `<div id="dialogue-menu"></div>`)
            doubllang.dBox.insertAdjacentHTML('beforeend', `<div id="dialogue-menu-doubllang"></div>`) // DOUBL.LANG CODE ADDITION

            dMenu = document.getElementById('dialogue-menu') //there's a new dialogue menu--the old one is now inactive
            doubllang.dMenu = document.getElementById('dialogue-menu-doubllang')  // DOUBL.LANG CODE ADDITION
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
                        if(reply.fakeEnd || reply.destination == "END") isEnd = reply.fakeEnd || "(end chat)" // DOUBL.LANG CODE ADDITION

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
                            
                            document.querySelector(`#dialogue-menu-doubllang span[reply="${this.getAttribute("reply")}"]`).closest('.dialogue-actor').classList.add('chosen')// DOUBL.LANG CODE ADDITION
                            document.querySelector(`#dialogue-menu-doubllang span[reply="${this.getAttribute("reply")}"]`).classList.add('chosen')// DOUBL.LANG CODE ADDITION
                            
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
                                sendDialogue(env.currentDialogue.chain[replyValue], 0, doubllang.currentChain[replyValue])  // DOUBL.LANG CODE ADDITION
                            }
                        })
                    }
                })
            })

            // DOUBL.LANG CODE ADDITION :: just copying this huge ass chunk cause im lazyyyyyy
            locdialogue.responses.forEach(actor => {
                let actorObj = getDialogueActor(actor.name, true)
                doubllang.dMenu.insertAdjacentHTML('beforeend', `
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
                            tooltip = "dude im unclickable"
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

            setTimeout(()=>{document.querySelectorAll('#dialogue-menu-doubllang .dialogue-actor').forEach(e=> {
                if(e.querySelector('.dialogue-options').childElementCount) e.classList.add('sent')
                else e.remove()
            })}, 50) // DOUBL.LANG CODE ADDITION
        }
        
        dBox.scrollTop = dBox.scrollHeight
        doubllang.dBox.scrollTop = doubllang.dBox.scrollHeight  // DOUBL.LANG CODE ADDITION
    } catch(e) {
        printError(e)
        if(!check("TEMP!!debug")) endDialogue()
    }
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
    
    markThisDialogueSeen('end')
    fixDialogueEnd()
    fixSkipDialogueBug()

    if(!env.forcingSwap) pauseFreemove(false, false)
    checkEpisodeProgress()
	setTimeout(()=>{
        env.currentDialogue.canStart = true
        document.querySelector('#dialogue-box').innerHTML = ""
        document.querySelector('#dialogue-box-doubllang').innerHTML = "" // DOUBL.LANG CODE ADDITION
        doubllang.dBox.classList.remove("gothefuckaway-doubllang") // DOUBL.LANG CODE ADDITION
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

function clearDialogueMenu() {
    var dMenu = document.getElementById('dialogue-menu')
    if(dMenu) {
        dMenu.classList.add('dialogue-menu')
        dMenu.id = ""
    }
    doubllang.dMenu = document.getElementById('dialogue-menu-doubllang') // DOUBL.LANG CODE ADDITION
    if(dMenu) { // DOUBL.LANG CODE ADDITION
        doubllang.dMenu.classList.add('dialogue-menu') // DOUBL.LANG CODE ADDITION
        doubllang.dMenu.id = "" // DOUBL.LANG CODE ADDITION
    }
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
        if(localization.dialogues) {
            env.currentDialogue.chain = env.dialogues[dialogueChain]
            doubllang.currentChain = localization.dialogues[`${page.dialoguePrefix}__${dialogueChain}`] || localization.dialogues[dialogueChain] || false
        }
        else {
            env.currentDialogue.chain = env.dialogues[dialogueChain]
            doubllang.currentChain = false
        }  // DOUBL.LANG CODE ADDITION
        
        env.currentDialogue.chainName = dialogueChain
        try {
            if (doubllang.currentChain) sendDialogue(typeof settings?.specificChain == "undefined" || settings?.specificChain === false ? env.currentDialogue.chain.start : env.currentDialogue.chain[settings?.specificChain], 0, typeof settings?.specificChain == "undefined" || settings?.specificChain === false ? doubllang.currentChain.start : doubllang.currentChain[settings?.specificChain])  // DOUBL.LANG CODE ADDITION
            else sendDialogue(typeof settings?.specificChain == "undefined" || settings?.specificChain === false ? env.currentDialogue.chain.start : env.currentDialogue.chain[settings?.specificChain])  // DOUBL.LANG CODE ADDITION
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

function changeDialogue(dialogueChain) {
    body.setAttribute('currentDialogue', dialogueChain)
    const localization = getLocalizationForPage()
    
    if(localization.dialogues) {
        env.currentDialogue.chain = env.dialogues[dialogueChain]
        doubllang.currentChain = localization.dialogues[dialogueChain] || false
    }
    else {
        env.currentDialogue.chain = env.dialogues[dialogueChain]
        doubllang.currentChain = false
    }  // DOUBL.LANG CODE ADDITION

    env.currentDialogue.chainName = dialogueChain
    env.currentDialogue.justChanged = true
    if (doubllang.currentChain) sendDialogue(env.currentDialogue.chain.start, 0, doubllang.currentChain.start)  // DOUBL.LANG CODE ADDITION
    else sendDialogue(env.currentDialogue.chain.start)// DOUBL.LANG CODE ADDITION

    document.getElementById('dialogue-box').classList.toggle("can-skip", env.currentDialogue.chain?.skip ? true : false)
}

function changeBranch(branchName) {
    sendDialogue(env.currentDialogue.chain[branchName], 0, doubllang.currentChain[branchName])  // DOUBL.LANG CODE ADDITION
}