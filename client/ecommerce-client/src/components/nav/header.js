import React, { useState } from 'react'
import { Menu } from 'antd'
import firebase from 'firebase'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory} from 'react-router-dom'
import {
    AppstoreOutlined, 
    SettingOutlined,
    UserOutlined,
    UserAddOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom'
let { SubMenu, Item } = Menu

let Header = () => {
    let [current, setCurrent] = useState('home')
    let dispatch = useDispatch()
    let state = useSelector(state => state)
    let history = useHistory()

    let handleClick = (e) => {
        setCurrent(e.key)
    }
    let logout = () => {
        firebase.auth().signOut()
        dispatch({
            type: 'LOGOUT',
            payload: null
        })
        history.push('/login')
    }
        return (
            <Menu onClick={handleClick}
                selectedKeys={[current]} mode="horizontal">
                <Item key="home" icon={<AppstoreOutlined />}>
                    <Link to="/">Home</Link>
                </Item>
              {!state.user ? <>
                <Item key="register" icon={<UserAddOutlined />} className="float-right">
                <Link to="/login">Login</Link>
                </Item>

                <Item key="login" icon={<UserOutlined />} className="float-right">
                <Link to="/register" key="register">Register</Link>
                </Item> 
                </> :
                <SubMenu icon={<SettingOutlined />} title={state.user.email.split('@')[0]} key="s">
                        <Item key="setting:1">Option 1</Item>
                        <Item key="setting:2">Option 2</Item>
                        <Item key="logout" onClick={logout}
                        icon={<LogoutOutlined />}>Logout</Item>
                </SubMenu>
               }
            </Menu>
        )
}

export default Header