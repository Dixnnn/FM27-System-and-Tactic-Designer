// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using System.Collections.Generic;
using System.Globalization;
using Il2CppInterop.Runtime;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using Il2CppSystem.Reflection;
using Il2CppObject = Il2CppSystem.Object;

namespace FM27TacticBuilder.Diagnostics
{
    /// <summary>
    /// Reads fields and properties of game objects through IL2CPP reflection,
    /// without knowing the game's classes at compile time. Read only.
    /// </summary>
    internal static class Il2CppInspector
    {
        private const BindingFlags AllInstance =
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

        public static string TypeName(Il2CppObject? obj)
        {
            if (obj == null)
                return "null";
            try
            {
                return obj.GetIl2CppType().FullName;
            }
            catch (Exception)
            {
                return "?";
            }
        }

        /// <summary>All type names from the class down to the base, e.g. for "is this a list?".</summary>
        public static IEnumerable<string> TypeChain(Il2CppObject obj)
        {
            var type = obj.GetIl2CppType();
            while (type != null)
            {
                yield return type.FullName;
                type = type.BaseType;
            }
        }

        public static string Short(Il2CppObject? value, int maxLength = 120)
        {
            if (value == null)
                return "null";
            string text;
            try
            {
                text = Unboxed(value) ?? value.ToString();
            }
            catch (Exception ex)
            {
                text = "<" + ex.GetType().Name + ">";
            }
            text = text.Replace("\r", "\\r").Replace("\n", "\\n");
            return text.Length > maxLength ? text.Substring(0, maxLength) + "..." : text;
        }

        /// <summary>Reads a property or field with this name, also from base classes.</summary>
        public static Il2CppObject? GetMember(Il2CppObject obj, string name)
        {
            var type = obj.GetIl2CppType();
            while (type != null)
            {
                var property = type.GetProperty(name, AllInstance);
                if (property != null && property.CanRead && property.GetIndexParameters().Length == 0)
                    return property.GetValue(obj, null);

                var field = type.GetField(name, AllInstance);
                if (field != null)
                    return field.GetValue(obj);

                type = type.BaseType;
            }
            return null;
        }

        public static int? GetInt(Il2CppObject obj, string name)
        {
            var value = GetMember(obj, name);
            if (value == null)
                return null;
            var text = Unboxed(value) ?? value.ToString();
            return int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number) ? number : null;
        }

        /// <summary>
        /// Text of a boxed value type. ToString() on the box gives nonsense in IL2CPP because the
        /// call doesn't point at the value itself, so it is unboxed on purpose.
        /// </summary>
        private static string? Unboxed(Il2CppObject value)
        {
            var type = value.GetIl2CppType();
            if (!type.IsValueType)
                return null;
            var c = CultureInfo.InvariantCulture;
            var prefix = type.IsEnum ? type.FullName + " = " : string.Empty;
            return prefix + UnboxedPrimitive(value, type.IsEnum ? type.GetEnumUnderlyingType().FullName : type.FullName, c);
        }

        private static string UnboxedPrimitive(Il2CppObject value, string typeName, CultureInfo c)
        {
            switch (typeName)
            {
                case "System.Int32": return value.Unbox<int>().ToString(c);
                case "System.UInt32": return value.Unbox<uint>().ToString(c);
                case "System.Int64": return value.Unbox<long>().ToString(c);
                case "System.UInt64": return value.Unbox<ulong>().ToString(c);
                case "System.Int16": return value.Unbox<short>().ToString(c);
                case "System.UInt16": return value.Unbox<ushort>().ToString(c);
                case "System.Byte": return value.Unbox<byte>().ToString(c);
                case "System.SByte": return value.Unbox<sbyte>().ToString(c);
                case "System.Single": return value.Unbox<float>().ToString(c);
                case "System.Double": return value.Unbox<double>().ToString(c);
                case "System.Boolean": return value.Unbox<bool>() ? "True" : "False";
                case "System.Char": return value.Unbox<char>().ToString();
                case "UnityEngine.Vector2": return value.Unbox<UnityEngine.Vector2>().ToString();
                case "UnityEngine.Vector3": return value.Unbox<UnityEngine.Vector3>().ToString();
                case "UnityEngine.Rect": return value.Unbox<UnityEngine.Rect>().ToString();
            }
            return "<" + typeName + ">";
        }

        /// <summary>Item of an IL2CPP list through its indexer.</summary>
        public static Il2CppObject? GetListItem(Il2CppObject list, int index)
        {
            var type = list.GetIl2CppType();
            var getter = type.GetMethod("get_Item") ?? type.GetMethod("GetValue", new[] { Il2CppSystem.Type.GetType("System.Int32") });
            if (getter == null)
                return null;

            var args = new Il2CppReferenceArray<Il2CppObject>(1);
            args[0] = BoxInt(index);
            return getter.Invoke(list, args);
        }

        private static unsafe Il2CppObject BoxInt(int value)
        {
            var klass = Il2CppClassPointerStore<int>.NativeClassPtr;
            return new Il2CppObject(IL2CPP.il2cpp_value_box(klass, (IntPtr)(&value)));
        }

        /// <summary>
        /// Describes all fields and properties of an object with type and value.
        /// With depth &gt; 0, child objects from the game's namespaces are expanded too.
        /// </summary>
        public static void Describe(Il2CppObject obj, string indent, int depth, Action<string> writeLine, ref int budget,
            bool skipUnity = false)
        {
            var type = obj.GetIl2CppType();
            while (type != null && type.FullName != "System.Object" && budget > 0)
            {
                // For UI elements only the game's classes matter, not the many properties
                // of Unity's VisualElement.
                if (skipUnity && type.FullName.StartsWith("UnityEngine.", StringComparison.Ordinal))
                {
                    writeLine($"{indent}[{type.FullName}] (Unity, skipped)");
                    break;
                }
                writeLine($"{indent}[{type.FullName}]");

                foreach (var field in type.GetFields(AllInstance))
                {
                    if (--budget < 0)
                        return;
                    Il2CppObject? value = null;
                    string shown;
                    try
                    {
                        value = field.GetValue(obj);
                        shown = Short(value);
                    }
                    catch (Exception ex)
                    {
                        shown = "<" + ex.GetType().Name + ">";
                    }
                    writeLine($"{indent}  F {field.Name} : {field.FieldType.Name} = {shown}");
                    Expand(value, field.FieldType, indent, depth, writeLine, ref budget);
                }

                foreach (var property in type.GetProperties(AllInstance))
                {
                    if (--budget < 0)
                        return;
                    if (!property.CanRead || property.GetIndexParameters().Length > 0)
                        continue;
                    Il2CppObject? value = null;
                    string shown;
                    try
                    {
                        value = property.GetValue(obj, null);
                        shown = Short(value);
                    }
                    catch (Exception ex)
                    {
                        shown = "<" + ex.GetType().Name + ">";
                    }
                    writeLine($"{indent}  P {property.Name} : {property.PropertyType.Name} = {shown}");
                    Expand(value, property.PropertyType, indent, depth, writeLine, ref budget);
                }

                type = type.BaseType;
            }
        }

        private static void Expand(Il2CppObject? value, Il2CppSystem.Type declared, string indent, int depth, Action<string> writeLine, ref int budget)
        {
            if (value == null || depth <= 0 || declared.IsPrimitive || declared.IsEnum)
                return;
            var ns = declared.Namespace ?? string.Empty;
            if (ns.StartsWith("System", StringComparison.Ordinal) || ns.StartsWith("Unity", StringComparison.Ordinal))
                return;
            Describe(value, indent + "    ", depth - 1, writeLine, ref budget);
        }
    }
}
