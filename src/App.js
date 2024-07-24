import React, {useState, useEffect} from 'react'
import { readString } from 'react-papaparse'
import cardListIn from "./Card List.csv"
import { CheckPicker, Button, ButtonToolbar, ButtonGroup, Input } from 'rsuite'
import Card from './Card'
import Art from './Card/Art'
import {rep} from './Card/util'
import 'rsuite/dist/rsuite.min.css';
import './App.css'
function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}
const allSorts = [
  "Art",
  "Name",
  "Card Type",
  "Unique",
  "Archetype",
  "Type",
  "CRC",
  "Cost",
  "Move",
  "ATK",
  "DEF",
  "HP",
  "Keywords",
  "Effect"
]

const getFiltered = (d, string) => d.map(c => c[string]).filter(onlyUnique)
const makeCollection = (d, string) => getFiltered(d, string).sort().map(v => ({ label: v, value: v }))

const doSomeSplits = (cards, split) => {
  if (split.length) {
    const splitty = split.shift()
    return getFiltered(cards, splitty).map((val) => ({[val]: doSomeSplits(cards.filter((card => card[splitty] === val)), [...split])})).reduce((agg, next) => ({ ...agg, ...next }),{})
  }
  return cards
}

function App() {
  const SPLIT = ["Card Type","Archetype","Type","CRC","Move","ATK","DEF","HP"].map(v => ({ label: v, value: v }))
  const [allCollections, setAllCollections] = useState({})
  const [splitBy, setSplitBy] = useState([])
  const [archetypes, setArchetypes] = useState([])
  const [crcs, setCrcs] = useState([])
  const [types, setTypes] = useState([])
  const [cardTypes, setCardTypes] = useState([])
  const [allCards, setAllCards] = useState([])
  const [selectedCard, setSelectedCard] = useState({})
  const [editor, setEditor] = useState("Cards")
  const [deck, _setDeck] = useState([])
  const [history, setHistory] = useState([[]])
  const [historyCursor, setHistoryCursor] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [named, setNamed] = useState("")
  const [deckNames, setDeckNames] = useState(window.localStorage.getItem("DeckNames") || "")

  useEffect (() => {
    fetch(cardListIn).then(res => res.text()).then(res => {
      const d = readString(res, { header: true, encoding: "utf-8", error: (e) => console.log(e) }).data
      d.pop()
      const cardList = d.map((data, i) => ({...data, id: i, Art: `Defaultcopy_${(i + 1).toString().padStart(3, '0')}`}))
      setAllCards(cardList)
      setAllCollections({
        archetypes: makeCollection(d, "Archetype"),
        crcs: makeCollection(d, "CRC"),
        types: makeCollection(d, "Type"),
        cardTypes: makeCollection(d, "Card Type"),
      })
      setSelectedCard(cardList[0])
    })
  }, [])

  useEffect(() => {
    const keydowncmd = ({ctrlKey, shiftKey, key}) => {
      if (ctrlKey) {
        if (key === "ArrowUp") {
          if (editor === "Deck") {
            setEditor("CardsDeck")
          } else if (editor === "CardsDeck") {
            setEditor("Cards")
          }
        } else if (key === "ArrowDown") {
          if (editor === "Cards") {
            setEditor("CardsDeck")
          } else if (editor === "CardsDeck") {
            setEditor("Deck")
          }
        } else if (key === "Z" || key === "z") {
          if (shiftKey) {
            redo()
          } else {
            undo()
          }
        } else if (key === "Y" || key === "y") {
          redo()
        }
      } else {
        try {
          const useDeck = editor === "Deck" ? flat(splitDeck) : flat(splitCards)
          if (key === "ArrowLeft") {
            const cardIndex = useDeck.toReversed().findIndex(card => card.id === selectedCard.id)
            if (cardIndex === -1) {
              const card = useDeck.toReversed().find(card => card.id < selectedCard.id)
              if (card) {
                setSelectedCard({...allCards[card.id]})
              }
            } else if (cardIndex !== 0) {
              setSelectedCard({...allCards[useDeck.toReversed()[cardIndex - 1].id]})
            }
          } else if (key === "ArrowRight") {
            const cardIndex = useDeck.findIndex(card => card.id === selectedCard.id)
            if (cardIndex === -1) {
              const card = useDeck.find(card => card.id > selectedCard.id)
              if (card) {
                setSelectedCard({...allCards[card.id]})
              }
            } else if (cardIndex !== (useDeck.length - 1)) {
              setSelectedCard({...allCards[useDeck[cardIndex + 1].id]})
            }
          } else if (key === "ArrowUp") {
            addToDeck(selectedCard)
          } else if (key === "ArrowDown") {
            removeFromDeck(selectedCard)
          }
        } catch {}
      }
    }
    document.addEventListener("keydown", keydowncmd, false);
    
    return () => {
      document.removeEventListener("keydown", keydowncmd, false);
    }
  }, [splitBy, archetypes, crcs, types, cardTypes, allCards, selectedCard, editor, deck, history, historyCursor]);

  const setDeck = (d) => {
    history.splice(history.length - historyCursor)
    const newHistory = [...history, [...d]]
    if (newHistory.length > 25) {
      newHistory.shift()
    }
    
    setHistory(newHistory)
    setHistoryCursor(0)
    _setDeck(d)
  }
  const undo = () => {
    const point = (history.length - 1) - historyCursor
    
    if (point > 0) {
      setHistoryCursor(historyCursor + 1)
      _setDeck([...history[point - 1]])
    } 
  }
  const redo = () => {
    const point = history.length - historyCursor
    
    if (point < history.length) {
      setHistoryCursor(historyCursor - 1)
      _setDeck([...history[point]])
    }
  }

  const con = (data) => {
    return data.map((card) => `${card.id}:${card.total}`).join(",")
  }

  const imp = (data) => {
    return data.split(",").map(id_total => {
      const [id, total] = id_total.split(":")
      return { ...allCards[id], total: parseInt(total, 10) }
    })
  }

  const convert = () => {
    navigator.clipboard.writeText(con(deck))
  }

  const importDeck = () => {
    navigator.clipboard.readText().then(unconverted => {
      try {
        setDeck(imp(unconverted))
      } catch {}
    })
  }

  const addToDeck = (card) => {
    const index = deck.findIndex(deckCard => deckCard.id === card.id)
    if (index > -1) {
      deck[index] = {...deck[index], total: deck[index].total + 1}
      setDeck([...deck])
    } else {
      setDeck([...deck, {...card, total: 1}].sort((a,b) => a.id - b.id))
    }
  }

  const removeFromDeck = (card) => {
    const index = deck.findIndex(deckCard => deckCard.id === card.id)
    if (index > -1) {
      const total = deck[index].total
      if (total === 1) {
        deck.splice(index, 1)
        setDeck([...deck])
      } else {
        deck[index] = {...deck[index], total: deck[index].total - 1}
        setDeck([...deck])
      }
    }
  }

  const MultiCheck = ({ labelVal, data, value, onChange }) => (
    <div className="flex column" style={{ margin: '5px' }}>
      <label>{labelVal ? labelVal : (<>&nbsp;</>)}</label>
      <CheckPicker {...{data,value,onChange}}/>
    </div>
  )

  const RenderCards = ({splitCards}, i = 0) => {
    const count = i || 0
    if (Array.isArray(splitCards)) {
      return (
        <div className='flex1 row center wrap'>
          {splitCards.map((props) => <Card {...props} onClick={setSelectedCard} />)}
        </div>
      )
    }
    return Object.keys(splitCards).map(sub => {
      const Component = React.createElement(count < 6 ? `h${count + 1}`: "p", {}, sub)
      return (
        <div className='flex1 column center'>
          {Component}
          <RenderCards splitCards={splitCards[sub]} i={count+1}/>
        </div>
      )
    }
  )}

  const doTheFilter = (cards) => cards.filter((card) => 
    (named !== "" ? card.Name.match(named) : true) &&
    (cardTypes.length ? cardTypes.includes(card["Card Type"]) : true) &&
    (archetypes.length ? archetypes.includes(card["Archetype"]) : true) &&
    (types.length ? types.includes(card["Type"]) : true) &&
    (crcs.length ? crcs.includes(card["CRC"]) : true)
  )

  const flat = (arrObj) => {
    if (Array.isArray(arrObj)) {
      return [...arrObj]
    } else {
      return Object.values(arrObj).map(v => flat(v)).reduce((agg, next) => [...agg, ...next],[])
    }
  }

  const filteredCards = doTheFilter(allCards)
  const splitCards = doSomeSplits(filteredCards, [...splitBy])
  const filteredDeck = doTheFilter(deck)
  const splitDeck = doSomeSplits(filteredDeck, [...splitBy])

  return (
    <div className="App flex1 row" style={{width: '100vw'}}>
      <div className='flex1 column'>
        <div className="flex row center" style={{ height: "100px" }}>
          <div className='flex column center'>
            <b>Filters</b>
            <div className="flex row center">
              <div className="flex column" style={{ margin: '5px' }}>
                <label>Name</label>
                <Input value={named} onChange={(v) => setNamed(v)}/>
              </div>
              <MultiCheck labelVal="Card Type" data={allCollections.cardTypes} value={cardTypes} onChange={setCardTypes}/>
              <MultiCheck labelVal="Archetype" data={allCollections.archetypes} value={archetypes} onChange={setArchetypes}/>
              <MultiCheck labelVal="Type" data={allCollections.types} value={types} onChange={setTypes}/>
              <MultiCheck labelVal="CRC" data={allCollections.crcs} value={crcs} onChange={setCrcs}/>
            </div>
          </div>
          <div className='flex column center'>
            <b>Split By</b>
            <div className='flex row center'>
              <MultiCheck data={SPLIT} value={splitBy} onChange={setSplitBy}/>
            </div>
          </div>
          <ButtonToolbar>
            <ButtonGroup>
              <Button appearance={editor === "Cards" ? "primary" : null} onClick={() => setEditor("Cards")}>Cards</Button>
              <Button appearance={editor === "CardsDeck" ? "primary" : null} onClick={() => setEditor("CardsDeck")}>Both</Button>
              <Button appearance={editor === "Deck" ? "primary" : null} onClick={() => setEditor("Deck")}>Deck</Button>
            </ButtonGroup>
          </ButtonToolbar>
          <b className='bigger' style={{ margin: '10px' }}>Total: {deck.reduce((agg, next) => agg + next.total,0)}</b>
          <ButtonToolbar>
            <ButtonGroup vertical>
              <Button onClick={convert}>Export</Button>
              <Button onClick={importDeck}>Import</Button>
            </ButtonGroup>
          </ButtonToolbar>
          <Button onClick={() => setShowDialog(true)}>Save/Load</Button>
        </div>
        {editor.includes("Cards") &&
          <div className="flex1 column center jstart" style={{ overflowY: 'scroll' }}>
            <RenderCards splitCards={splitCards} i={0} />
          </div>
        }
        {editor === "CardsDeck" && <hr />}
        {editor.includes("Deck") &&
          <div className="flex1 column center jstart" style={{ overflowY: 'scroll' }}>
            <RenderCards splitCards={splitDeck} i={0} />
          </div>
        }
      </div>
      {selectedCard.Art &&
        <div className='flex center'>
          <img alt={selectedCard.Name} src={Art[rep(selectedCard.Art)]} style={{ position: 'sticky', top: '0px', height: '100%', aspectRatio: '2.5/3.5'}}/>
          <ButtonToolbar style={{ position: 'fixed', bottom: '0'}}>
            <ButtonGroup>
              <Button onClick={() => removeFromDeck(selectedCard)}><span className="bigger">-</span></Button>
              <Button disabled>{(() => {
                const cardIndex = deck.findIndex(c => c.id === selectedCard.id)
                return cardIndex > -1 ? deck[cardIndex].total : 0
              })()}</Button>
              <Button onClick={() => addToDeck(selectedCard)}><span className="bigger">+</span></Button>
            </ButtonGroup>
          </ButtonToolbar>
        </div>
      }
      {showDialog &&
        <div className='modal flex1 column center' onClick={(e) => {e.target === e.currentTarget && setShowDialog(false)}}>
          <div className='modalSub flex1 center column fill' style={{ backgroundColor: "var(--rs-body)"}}>
            <div className='flex center row'>
              <div>
                <Input value={saveName} onChange={setSaveName}/>
              </div>
              <ButtonToolbar>
                <ButtonGroup>
                  <Button onClick={() => {
                    const loaded = window.localStorage.getItem(saveName)
                    if (loaded) {
                      try {
                        const loadedDeck = imp(loaded)
                        setDeck(loadedDeck)
                        setShowDialog(false)
                      } catch {}
                    }
                  }}>Load</Button>
                  <Button onClick={() => {
                    window.localStorage.setItem(saveName, con(deck))
                    if (!deckNames.split(",").includes(saveName)) {
                      const deckList = `${deckNames},${saveName}`
                      window.localStorage.setItem("DeckNames", deckList)
                      setDeckNames(deckNames)
                    }
                  }}>Save</Button>
                  <Button onClick={() => {
                    const deckList = deckNames.split(",").filter(item => item !== saveName).join(",")
                    window.localStorage.setItem("DeckNames", deckList)
                    window.localStorage.removeItem(saveName)
                    setDeckNames(deckList)
                  }}>Delete</Button>
                </ButtonGroup>
              </ButtonToolbar>
            </div>
            <div key={deckNames} className='flex center row'>
              {deckNames.split(",").map(v => v !== "" && <Button appearance='primary' onClick={() => setSaveName(v)}>{v}</Button>)}
            </div>
          </div>
        </div>}
    </div>
  );
}

export default App;
