import React from 'react'
import Art from './Art'
import { rep } from './util'

const Card = (props) => {
  return (
    <div style={{
      display: 'inline',
      height: '200px',
      aspectRatio: "2.5/3.5"
    }} onClick={() => props.onClick(props)}>
      <img className="fill" src={Art[rep(props.Art)]} />
      {props.total && <span style={{position: 'relative', top: '-35px',color: 'white'}}>x{props.total}</span>}
    </div>
  )
}

export default Card