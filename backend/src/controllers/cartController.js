const express = require("express");
const cartService = require("../services/cartService");

const ok = (res, data) => res.status(200).json({ success: true, data });
const fail = (res, err) => {
    const code = err.statusCode || 500;
    res.status(code).json({ success: false, message: err.message });
};

const getMyCart = async (req, res) => {
    try {
        const cart = await cartService.getCart(req.user.id);
        ok(res, cart);
    } catch (err) { fail(res, err); }
};

const addItem = async (req, res) => {
    try {
        const { variant_id, quantity } = req.body;
        const cart = await cartService.addItem(req.user.id, variant_id, quantity);
        ok(res, cart);
    } catch (err) { fail(res, err); }
};

const updateItem = async (req, res) => {
    try {
        const { variant_id, quantity } = req.body;
        const cart = await cartService.updateItemQuantity(req.user.id, variant_id, quantity);
        ok(res, cart);
    } catch (err) { fail(res, err); }
};

const removeItem = async (req, res) => {
    try {
        const { variant_id } = req.params;
        const cart = await cartService.removeItem(req.user.id, variant_id);
        ok(res, cart);
    } catch (err) { fail(res, err); }
};

const clearCart = async (req, res) => {
    try {
        const cart = await cartService.clearCart(req.user.id);
        ok(res, cart);
    } catch (err) { fail(res, err); }
};

module.exports = { getMyCart, addItem, updateItem, removeItem, clearCart };
